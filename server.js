/*
    Author: Robert Hermann
    Date: April 29, 2024
    Description: Codecademy off-platform project to create API for budgeting app

      TO DO List:
    1) refactor code - lots of redundant error checking

    2) implement "total budget" and track that with real-time
        updates
    
    3) implement data sanitation - npm express-validator
        https://www.npmjs.com/package/express-validator
    
    4) more error checking
*/
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const dbc = require("./category_queries");
const dbe = require("./expense_queries");

const PORT = 3000;

//parses all incoming request data as JSON, i.e. strings
app.use(bodyParser.json());

app.post("/categories", dbc.createCategory);
app.get("/categories", dbc.getCategories);
app.get("/categories/:category_id", dbc.getCategoryById);
app.put("/categories/:category_id", dbc.updateCategory);
app.post("/categories/transfer/:from/:to", dbc.transferBudget);
app.delete("/categories/:category_id", dbc.deleteCategory);

app.post("/expenses", dbe.addExpense);
app.get("/expenses", dbe.getExpenses);
app.get("/expenses/:expense_id", dbe.getExpenseById);
app.put("/expenses/:expense_id", dbe.updateExpense);
app.delete("/expenses/:expense_id", dbe.deleteExpense);

//Error Handling
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).send(err.message);
});

app.listen(PORT, function () {
  console.log(`Server running at http://localhost:${PORT}`);
});
