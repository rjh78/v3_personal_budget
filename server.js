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

//parses all incoming request data as JSON, i.e. strings
app.use(bodyParser.json());

app.post("/categories", db.createCategory);
app.get("/categories", db.getCategories);
app.get("/categories/:category_id", db.getCategoryById);
app.put("/categories/:category_id", db.updateCategory);
app.post("/categories/transfer/:from/:to", db.transferBudget);
app.delete("/categories/:category_id", db.deleteCategory);

app.post("/expenses", db.addExpense);
app.get("/expenses", db.getExpenses);
//app.put("/expenses/:expense_id", db.updateExpense);
app.delete("/expenses/:expense_id", db.deleteExpense);

//Error Handling
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).send(err.message);
});

app.listen(PORT, function () {
  console.log(`Server running at http://localhost:${PORT}`);
});
