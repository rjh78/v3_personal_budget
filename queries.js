require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB.PORT,
});

/*
categoryArray is for testing that modules are working.
//once API is connected to Postgres, the array will not
//be needed.
let categoryArray = [
  {
    catId: 1,
    catName: "Food-Market",
    catBudget: 350,
  },
  {
    catId: 2,
    catName: "Rent",
    catBudget: 1500,
  },
  {
    catId: 3,
    catName: "Auto-Gas",
    catBudget: 80,
  },
];


//needed while using the category Array for testing
let catId = 4;
*/

//create a new category where the category name and dollar
//amt are sent in the request body.
//POSTMAN TESTING NOTE: BODY DATA MUST BE FORMATTED AS JSON,
//EXCEPT FOR INTEGERS WHICH ARE NOT QUOTED
const createCategory = (req, res) => {
  const { catName, catBudget } = req.body;
  if (catName === "" || catBudget < 0) {
    res.status(404).send("Invalid request body - no name or budget.");
  }
  const newCategory = { catId: catId, catName: catName, catBudget: catBudget };
  catId++;
  categoryArray.push(newCategory);
  res.status(201).json(newCategory);
};

/*
//return all categories created
const getCategories = (req, res) => {
  if (categoryArray.length > 0) {
    res.status(200).json(categoryArray);
  } else {
    res.status(404).send("No categories created yet.");
  }
};
*/

const getCategories = (req, res) => {
  pool.query("", (error, results) => {});
};

//return a specific category where the category ID is
//sent in the query parameter. req.params.catId is read
//as a string, so convert to an integer for endpoint to work
const getCategoryById = (req, res) => {
  let searchId = Number(req.params.catId);
  const found = categoryArray.find((element) => element.catId === searchId);
  if (found) {
    res.status(200).json(found);
  } else {
    res.status(404).send(`Category ID: ${searchId} not found.`);
  }
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
