/*
    dotenv module loads environment variables from a .env file into process.env.
    .env is added to .gitignore to keep DB credentials out of source control.
    Load environment variables using the dotenv module.

    '{Pool} = require pg' is a destructuring assignment in JavaScript to import 
    the Pool class from the pg module. The pg module is the official PostgreSQL 
    client for Node.js, which allows you to interact with a PostgreSQL database 
    from your Node.js application.
*/
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

//create a new category where the category name and planned budget
//amount are sent in the request body.
//POSTMAN TESTING NOTE: BODY DATA MUST BE FORMATTED AS JSON,
//EXCEPT FOR INTEGERS WHICH ARE NOT QUOTED
const createCategory = (req, res, next) => {
  const name = req.body.name;
  const planned_budget = req.body.planned_budget ?? 0;
  const actual_balance = 0;

  if (name === "" || planned_budget < 0) {
    return res
      .status(404)
      .send("Invalid request body - no name or negative budget value.");
  }
  const remaining_balance = planned_budget;

  pool.query(
    "INSERT INTO category (name, planned_budget, remaining_balance, actual_balance) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, planned_budget, remaining_balance, actual_balance],
    (error, results) => {
      if (error) {
        return next(error);
      }
      res
        .status(201)
        .send(`Category added with ID ${results.rows[0].category_id}`);
    }
  );
};

//returns all categories in the category table
const getCategories = (req, res, next) => {
  pool.query("SELECT * FROM category", (error, results) => {
    if (error) {
      return next(error);
    }
    res.status(200).json(results.rows);
  });
};

//return a specific category where the category ID is
//sent in the query parameter. req.params.category_id is read
//as a string, so convert to an integer for endpoint to work.
//if searchId not found, an empty array is returned, have
//to check length of results.rows array to find out
const getCategoryById = (req, res, next) => {
  let searchId = Number(req.params.category_id);
  pool.query(
    "SELECT * FROM category WHERE category_id = $1",
    [searchId],
    (error, results) => {
      if (error) {
        return next(error);
      }
      if (results.rowCount === 0) {
        return res
          .status(404)
          .send(
            `Category Id ${searchId} not found in DB, possibly a deleted record.`
          );
      }
      res.status(200).json(results.rows);
    }
  );
};

/*
 updates category name only, updates category budget amount only,
 or updates both name and budget amounts. Ternary Operator does
 validation for budget and name. COALESCE returns first non-null
 value and the ::text/::numeric explicitly casts the variable to 
 a specific datatype. The COALESCE lets the updates be done in a
 single query and will update name only, budget only, or both.
*/
const updateCategory = (req, res, next) => {
  let searchId = Number(req.params.category_id);
  let newBudget = req.body.planned_budget ?? 0;
  let newName = req.body.name !== undefined ? req.body.name : null;
  const dollarErr = "planned_budget value must be >= 0";

  if (newBudget < 0) {
    return next(new Error(dollarErr));
  }

  pool.query(
    "UPDATE category SET name = COALESCE($1::text, name), planned_budget = COALESCE($2::numeric, planned_budget) WHERE category_id = $3 RETURNING *",
    [newName, newBudget, searchId],
    (error, results) => {
      if (error) {
        return next(error);
      }
      if (results.rowCount === 0) {
        return next(
          new Error(`Category ID: ${searchId} not found. No update done.`)
        );
      }
      res.status(200).json(results.rows);
    }
  );
};

/*
POST request that uses two route parameters and transfers
a value of dollars from one category to another. Permits
taking $x from one category and moving them to another category.
*/
const transferBudget = async (req, res, next) => {
  let fromCategoryId = Number(req.params.from);
  let toCategoryId = Number(req.params.to);
  let transferAmt = Number(req.body.transferAmt); //need validation that not a negative number

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const decreaseResult = await client.query(
      "UPDATE category SET planned_budget = planned_budget - $1 WHERE category_id = $2 RETURNING *",
      [transferAmt, fromCategoryId]
    );
    if (decreaseResult.rowCount === 0) {
      return next(
        new Error(
          `Transfer_From id ${fromCategoryId} not found. No transfer done.`
        )
      );
    }

    const increaseResult = await client.query(
      "UPDATE category SET planned_budget = planned_budget + $1 WHERE category_id = $2 RETURNING *",
      [transferAmt, toCategoryId]
    );
    if (increaseResult.rowCount === 0) {
      return next(
        new Error(`Transfer_To id ${toCategoryId} not found. No transfer done.`)
      );
    }

    await client.query("COMMIT");
    res.status(200).send({
      message: `$${transferAmt} transferred from ${fromCategoryId} to ${toCategoryId}.`,
      fromCategory: decreaseResult.rows[0],
      toCategory: increaseResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transaction error:", error);
    return res.status(500).send("Internal Server Error");
  } finally {
    client.release();
  }
};

//deletes the specified category id
const deleteCategory = (req, res, next) => {
  let searchId = Number(req.params.category_id);

  pool.query(
    "DELETE FROM category WHERE category_id = $1",
    [searchId],
    (error, results) => {
      if (error) {
        return next(error);
      }
      if (results.rowCount === 0) {
        return next(
          new Error(`Category ID ${searchId} not found. No deletion done.`)
        );
      }
      res.status(200).send(`Category ID ${searchId} successfully deleted.`);
    }
  );
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  transferBudget,
  deleteCategory,
};
