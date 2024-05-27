/*
    dotenv module loads environment variables from a .env file into process.env.
    .env is added to .gitignore to keep DB credentials out of source control.
    Load environment variables using the dotenv module.

    '{Pool} = require pg' is a destructuring assignment in JavaScript to import the Pool class from the pg module. The pg module is the official PostgreSQL client for Node.js, which allows you to interact with a PostgreSQL database from your Node.js application.
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

//create a new category where the category name and dollar
//amt are sent in the request body.
//POSTMAN TESTING NOTE: BODY DATA MUST BE FORMATTED AS JSON,
//EXCEPT FOR INTEGERS WHICH ARE NOT QUOTED
const createCategory = (req, res) => {
  const name = req.body.name;
  const planned_budget = Number(req.body.planned_budget);

  if (name === "" || planned_budget < 0) {
    res.status(404).send("Invalid request body - no name or budget.");
  }
  pool.query(
    "INSERT INTO category (name, planned_budget) VALUES ($1, $2) RETURNING *",
    [name, planned_budget],
    (error, results) => {
      if (error) {
        console.error("Database query error:", error);
        return res.status(500).send("Internal Server Error");
      }
      res
        .status(201)
        .send(`Category added with ID ${results.rows[0].category_id}`);
    }
  );
};

const getCategories = (req, res) => {
  pool.query("SELECT * FROM category", (error, results) => {
    if (error) {
      console.error("Database query error:", error);
      return res.status(500).send("Internal Server Error");
    }
    res.status(200).json(results.rows);
  });
};

//return a specific category where the category ID is
//sent in the query parameter. req.params.catId is read
//as a string, so convert to an integer for endpoint to work.
//if searchId not found, an empty array is returned, have
//to check length of results.rows array to find out
const getCategoryById = (req, res) => {
  let searchId = Number(req.params.catId);
  pool.query(
    "SELECT * FROM category WHERE category_id = $1",
    [searchId],
    (error, results) => {
      if (error) {
        console.error("Database query error:", error);
        return res.status(500).send("Internal Server Error");
      }
      if (results.rows.length === 0) {
        res
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
  Probably more complicated than it should be. Does the following:
  1. updates category name only (Action = updateName)
  2. updates category budget amount only (Action = updateBudget)
  3. updates both name and budget amounts (Action = updateNameAndBudget)
  4. subtracts expense from specified category budget (Action = subtractExpense)
*/
const updateCategory = (req, res, next) => {
  let searchId = Number(req.params.catId);
  let expenseAmt = req.body.expenseAmt;
  let newBudget = req.body.catBudget;
  let newName = req.body.catName;
  let action = req.query.action;
  let newBalance = 0;
  let found = categoryArray.find((element) => element.catId === searchId);
  const dollarErr = new Error(
    "expenseAmt or catBudget must be a positive number."
  );
  const nameErr = new Error("Category Name is invalid or missing.");
  const actionErr = new Error(
    "Invalid Action or no Action specified in query parameter."
  );

  if (found) {
    switch (action) {
      case "updateName":
        if (newName) {
          found.catName = newName;
        } else {
          return next(nameErr);
        }
        break;
      case "updateBudget":
        if (newBudget > 0) {
          found.catBudget = newBudget;
        } else {
          return next(dollarErr);
        }
        break;
      case "updateNameAndBudget":
        if (newBudget > 0 && newName) {
          found.catName = newName;
          found.catBudget = newBudget;
        } else {
          return next(
            new Error("Either name or budget is invalid or missing.")
          );
        }
        break;
      case "subtractExpense":
        if (expenseAmt > 0) {
          found.catBudget -= expenseAmt;
        } else {
          return next(dollarErr);
        }
        break;
      default:
        return res.status(500).send(actionErr);
    }
    res.status(200).json(categoryArray);
  } else {
    res.status(404).send(`Category ID: ${searchId} not found.`);
  }
};

//POST request that uses two route parameters and transfers
//a value of dollars from one category to another.
const transferBudget = async (req, res, next) => {
  let fromCategoryId = Number(req.params.from);
  let toCategoryId = Number(req.params.to);
  let transferAmt = Number(req.body.transferAmt);

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

//deletes the specified category id by finding the array
//index of the specified id and then "splicing" it out
//of the array
const deleteCategory = (req, res, next) => {
  let searchId = Number(req.params.catId);

  pool.query(
    "DELETE FROM category WHERE category_id = $1",
    [searchId],
    (error, results) => {
      if (error) {
        //return next(error);
        console.error("Database query error:", error);
        return res.status(500).send("Internal Server Error");
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
