/*
    Author: Robert Hermann
    Date: April 29, 2024
    Description: Codecademy off-platform project to create API for budgeting app
*/
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const PORT = 3000;
let categoryArray = [
  {
    envId: 1,
    envName: "Food-Market",
    envBudget: 350,
  },
  {
    envId: 2,
    envName: "Rent",
    envBudget: 1500,
  },
  {
    envId: 3,
    envName: "Auto-Gas",
    envBudget: 80,
  },
];
let envId = 4;

//parses all incoming request data as JSON, i.e. strings
app.use(bodyParser.json());

//create a new envelope where the envelope name and dollar
//amt are sent in the request body.
//POSTMAN TESTING NOTE: BODY DATA MUST BE FORMATTED AS JSON,
//EXCEPT FOR INTEGERS WHICH ARE NOT QUOTED
app.post("/envelopes", (req, res) => {
  const { envName, envBudget } = req.body;
  if (envName === "" || envBudget < 0) {
    res.status(404).send("Invalid request body - no name or budget.");
  }
  const newCategory = { envId: envId, envName: envName, envBudget: envBudget };
  envId++;
  categoryArray.push(newCategory);
  res.status(201).json(newCategory);
});

//return all envelope categories created
app.get("/envelopes", (req, res) => {
  if (categoryArray.length > 0) {
    res.status(200).json(categoryArray);
  } else {
    res.status(404).send("No categories created yet.");
  }
});

//return a specific envelope where the envelope ID is
//sent in the query parameter. req.params.envId is read
//as a string, so convert to an integer for endpoint to work
app.get("/envelopes/:envId", (req, res) => {
  let searchId = Number(req.params.envId);
  const found = categoryArray.find((element) => element.envId === searchId);
  if (found) {
    res.status(200).json(found);
  } else {
    res.status(404).send(`Envelope ID: ${searchId} not found.`);
  }
});

/*
  Probably more complicated than it should be. Does the following:
  1. updates envelope name only
  2. updates envelope budget amount only
  3. updates both name and budget amounts
  4. subtracts expense from specified envelope budget
*/
app.put("/envelopes/:envId", (req, res, next) => {
  let searchId = Number(req.params.envId);
  let expenseAmt = req.body.expenseAmt;
  let newBudget = req.body.envBudget;
  let newName = req.body.envName;
  let action = req.query.action;
  let newBalance = 0;
  let found = categoryArray.find((element) => element.envId === searchId);
  const dollarErr = new Error(
    "expenseAmt or envBudget must be a positive number."
  );
  const nameErr = new Error("Envelope Name is invalid or missing.");

  if (found) {
    switch (action) {
      case "updateName":
        if (newName) {
          found.envName = newName;
        } else {
          return next(nameErr);
        }
        break;
      case "updateBudget":
        if (newBudget > 0) {
          found.envBudget = newBudget;
        } else {
          return next(dollarErr);
        }
        break;
      case "updateNameAndBudget":
        if (newBudget > 0 && newName) {
          found.envName = newName;
          found.envBudget = newBudget;
        } else {
          return next(
            new Error("Either name or budget is invalid or missing.")
          );
        }
        break;
      case "subtractExpense":
        if (expenseAmt > 0) {
          found.envBudget -= expenseAmt;
        } else {
          return next(dollarErr);
        }
        break;
      default:
        return res.status(500).send("Invalid Action or no Action specified.");
    }
    res.status(200).json(categoryArray);
  } else {
    res.status(404).send(`Envelope ID: ${searchId} not found.`);
  }
});

//POST request that uses two parameters and transfers
//a value of dollars from one envelope to another.
app.post("/envelopes/transfer/:from/:to", (req, res, next) => {
  let fromId = Number(req.params.from);
  let toId = Number(req.params.to);
  let transferAmt = req.body.transferAmt;

  let fromIndex = categoryArray.findIndex(
    (element) => element.envId === fromId
  );
  let toIndex = categoryArray.findIndex((element) => element.envId === toId);

  if (fromIndex === -1 || toIndex === -1) {
    return next(
      new Error(
        `'Transfer From' id ${fromId} or 'Transfer To' id ${toId} not found.`
      )
    );
  }

  categoryArray[fromIndex].envBudget -= transferAmt;
  categoryArray[toIndex].envBudget += transferAmt;

  res
    .status(200)
    .send(
      `${transferAmt} transferred from ${categoryArray[fromIndex].envName} to ${categoryArray[toIndex].envName}.`
    );
});

//deletes the specified envelope id by finding the array
//index of the specified id and then "splicing" it out
//of the array
app.delete("/envelopes/:envId", (req, res, next) => {
  let searchId = Number(req.params.envId);
  let envIndex = categoryArray.findIndex(
    (element) => element.envId === searchId
  );
  if (envIndex === -1) {
    return next(
      new Error(`Envelope ID ${searchId} not found. No deletion done.`)
    );
  }
  categoryArray.splice(envIndex, 1);
  res.status(200).send(`Envelope ID ${searchId} successfully deleted.`);
});

//Error Handling
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).send(err.message);
});

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}`);
});
