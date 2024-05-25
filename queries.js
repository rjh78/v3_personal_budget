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
  const { catName, catBudget } = req.body;
  if (catName === "" || catBudget < 0) {
    res.status(404).send("Invalid request body - no name or budget.");
  }
  pool.query(
    "INSERT INTO category (name, planned_budget) VALUES ($1, $2) RETURNING *",
    [catName, catBudget],
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
//as a string, so convert to an integer for endpoint to work
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
  const found = categoryArray.find((element) => element.catId === searchId);
  if (found) {
    res.status(200).json(found);
  } else {
    res.status(404).send(`Category ID: ${searchId} not found.`);
  }
*/

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
        return res
          .status(500)
          .send("Invalid Action or no Action specified in query parameter.");
    }
    res.status(200).json(categoryArray);
  } else {
    res.status(404).send(`Category ID: ${searchId} not found.`);
  }
};

//POST request that uses two parameters and transfers
//a value of dollars from one category to another.
const transferBetweenCategories = (req, res, next) => {
  let fromId = Number(req.params.from);
  let toId = Number(req.params.to);
  let transferAmt = req.body.transferAmt;

  let fromIndex = categoryArray.findIndex(
    (element) => element.catId === fromId
  );
  let toIndex = categoryArray.findIndex((element) => element.catId === toId);

  if (fromIndex === -1 || toIndex === -1) {
    return next(
      new Error(
        `'Transfer From' id ${fromId} or 'Transfer To' id ${toId} not found.`
      )
    );
  }
  categoryArray[fromIndex].catBudget -= transferAmt;
  categoryArray[toIndex].catBudget += transferAmt;
  res
    .status(200)
    .send(
      `$${transferAmt} transferred from ${categoryArray[fromIndex].catName} to ${categoryArray[toIndex].catName}.`
    );
};

//deletes the specified category id by finding the array
//index of the specified id and then "splicing" it out
//of the array
const deleteCategory = (req, res, next) => {
  let searchId = Number(req.params.catId);
  let catIndex = categoryArray.findIndex(
    (element) => element.catId === searchId
  );
  if (catIndex === -1) {
    return next(
      new Error(`Category ID ${searchId} not found. No deletion done.`)
    );
  }
  categoryArray.splice(catIndex, 1);
  res.status(200).send(`Category ID ${searchId} successfully deleted.`);
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  transferBetweenCategories,
  deleteCategory,
};
