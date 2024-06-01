/*
    dotenv module loads environment variables from a .env file into process.env.
    .env is added to .gitignore to keep DB credentials out of source control.
    Load environment variables using the dotenv module.

    '{Pool} = require pg' is a destructuring assignment in JavaScript to import 
    the Pool class from the pg module. The pg module is the official PostgreSQL 
    client for Node.js, which allows you to interact with a PostgreSQL database 
    from your Node.js application.


    TO DO - BUG IN UPDATE, THE AMOUNT FIELD GETS ZEROED OUT IF NOT INCLUDED IN REQUEST BODY - LOGIC FLAW 
            NEED TO TEST EVERY FIELD IN UPDATE TO SEE IF IT GETS ZEROED OUT OR NOT
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

/*
Adds an expense to expense table - there is a trigger
that gets called on an INSERT into the expense table.
The trigger updates the remaining_balance and 
actual_balance fields in the category table.
*/
const addExpense = async (req, res, next) => {
  const defaultValues = {
    date: null,
    amount: 0,
    description: null,
    payment_method: null,
    entity_id: null,
    entity_type: null,
    category_id: null,
  };

  const {
    date,
    amount,
    description,
    payment_method,
    entity_id,
    entity_type,
    category_id,
  } = { ...defaultValues, ...req.body };

  const client = await pool.connect();

  try {
    await client.query(
      "INSERT INTO expense (date, amount, description, payment_method, entity_id, entity_type, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [
        date,
        amount,
        description,
        payment_method,
        entity_id,
        entity_type,
        category_id,
      ],
      (error, results) => {
        if (error) {
          return next(error);
        }
        res.status(201).json(results.rows);
      }
    );
  } catch (error) {
    await client.query("ROLLBACK TRANSACTION");
    return next(error);
  } finally {
    client.release();
  }
};

//returns all expenses listed in the expense table
const getExpenses = (req, res, next) => {
  pool.query("SELECT * FROM expense", (error, results) => {
    if (error) {
      return next(error);
    }
    res.status(200).json(results.rows);
  });
};

const getExpenseById = (req, res, next) => {
  let searchId = Number(req.params.expense_id);
  pool.query(
    "SELECT * FROM expense WHERE expense_id = $1",
    [searchId],
    (error, results) => {
      if (error) {
        return next(error);
      }
      if (results.rowCount === 0) {
        res
          .status(404)
          .send(`Expense Id ${searchId} not found, possibly a deleted record.`);
      }
      res.status(200).json(results.rows);
    }
  );
};

const updateExpense = (req, res, next) => {
  let searchId = Number(req.params.expense_id);
  const defaultValues = {
    date: null,
    amount: 0,
    description: null,
    payment_method: null,
    entity_id: null,
    entity_type: null,
    category_id: null,
  };

  const {
    date,
    amount,
    description,
    payment_method,
    entity_id,
    entity_type,
    category_id,
  } = { ...defaultValues, ...req.body };

  pool.query(
    "UPDATE expense SET date = COALESCE($1::date, date), amount = COALESCE($2::numeric, amount), description = COALESCE($3::text, description), payment_method = COALESCE($4::text, payment_method), entity_id = COALESCE($5::numeric, entity_id), entity_type = COALESCE($6::text, entity_type), category_id = COALESCE($7::numeric, category_id) WHERE expense_id = $8 RETURNING *",
    [
      date,
      amount,
      description,
      payment_method,
      entity_id,
      entity_type,
      category_id,
      searchId,
    ],
    (error, results) => {
      if (error) {
        return next(error);
      }
      if (results.rowCount === 0) {
        return next(
          new Error(`Expense ID: ${searchId} not found. No update done.`)
        );
      }
      res.status(200).json(results.rows);
    }
  );
};

//deletes expense specified by user
const deleteExpense = (req, res, next) => {
  let searchId = Number(req.params.expense_id);

  pool.query(
    "DELETE FROM expense WHERE expense_id = $1",
    [searchId],
    (error, results) => {
      if (error) {
        return next(error);
      }
      if (results.rowCount === 0) {
        return next(
          new Error(`Expense ID ${searchId} not found. No deletion done.`)
        );
      }
      res.status(200).send(`Expense ID ${searchId} successfully deleted.`);
    }
  );
};

module.exports = {
  addExpense,
  getExpenses,
  getExpenseById,
  deleteExpense,
  updateExpense,
};
