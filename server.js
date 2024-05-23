/*
    Author: Robert Hermann
    Date: April 29, 2024
    Description: Codecademy off-platform project to create API for budgeting app
*/
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const db = require("./queries");

const PORT = 3000;
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
let catId = 4;

//parses all incoming request data as JSON, i.e. strings
app.use(bodyParser.json());

app.post("/categories", db.createCategory);
app.get("/categories", db.getCategories);
app.get("/categories/:catId", db.getCategoryById);
app.put("/categories/:catId", db.updateCategory);
app.post("/categories/transfer/:from/:to", transferBetweenCategories);
app.delete("/categories/:catId", db.deleteCategory);

//Error Handling
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).send(err.message);
});

app.listen(PORT, function () {
  console.log(`Serving running at http://localhost:${PORT}`);
});
