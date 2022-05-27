const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

var customers = [
  {
    id: "7c8e8f0b-1e7f-4e2c-ae91-7022176e4044",
    cpf_cnpj: "56632613039",
    name: "Carolyne Hand",
    statement: [],
  },
];

//MIDDLEWARE
function verifyIfExistsAccountCpfCnpj(request, res, next) {
  const { cpf_cnpj } = request.headers;
  const customer = customers.find((customer) => customer.cpf_cnpj === cpf_cnpj);

  if (!customer) {
    return res.status(400).json({ error: "Account not found" });
  }

  //passa o objeto customer para a proxima função
  request.customer = customer;

  return next();
}

function getBalance(statement) {
  //acc = acumulador | operation = operação | balance = saldo
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "deposit") {
      return acc + operation.ammount;
    } else {
      return acc - operation.ammount;
    }
  }, 0);
  return balance;
}

//DO JEITO ABAIXO, TODAS AS ROTAS IRÃO USAR O MIDDLEWARE
//app.use(verifyIfExistsAccountCpfCnpj);

/*
 * TIPOS PARAMETROS
 * Route Params => Identifica um recurso através da URL: editar/deletar/buscar/etc
 * Query Params => Parâmetros nomeados enviados na rota após o "?" (Filtros, paginação)
 * Body Params => Parâmetros enviados no corpo da requisição (Criação/Atualização) => JSON
 */

app.post("/account", (request, response) => {
  const { cpf_cnpj, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customers) => customers.cpf_cnpj === cpf_cnpj
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists" });
  }

  if (cpf_cnpj === undefined || cpf_cnpj.leght === 0) {
    return response.status(400).json({ error: "CPF/CNPJ is required" });
  }

  const id = uuidv4();
  customers.push({ id, cpf_cnpj, name, statement: [] });

  return response.status(201).send({ id: id, message: "Customer created" });
});

app.get("/statement/", verifyIfExistsAccountCpfCnpj, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});

app.post("/deposit", verifyIfExistsAccountCpfCnpj, (request, response) => {
  const { customer } = request;
  const { ammount, description } = request.body;

  const statementOperation = {
    ammount: ammount,
    created_at: new Date(),
    description: description,
    type: "deposit",
  };
  customer.statement.push(statementOperation);

  response.json(customer.statement);
});

app.post("/withdraw", verifyIfExistsAccountCpfCnpj, (request, response) => {
  const { customer } = request;
  const { ammount, description } = request.body;
  const balance = getBalance(customer.statement);

  if (balance < ammount) {
    return response
      .status(400)
      .json({ message: "Insufficient funds", balance: balance });
  }

  const statementOperation = {
    ammount: ammount,
    created_at: new Date(),
    type: "withdraw",
  };
  customer.statement.push(statementOperation);

  return response.status(201).json({
    balance: getBalance(customer.statement),
    message: "Withdraw success",
  });
});

app.get(
  "/statement/date",
  verifyIfExistsAccountCpfCnpj,
  (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    if (!date || date.length === 0) {
      return response.status(400).json({ error: "Date is required" });
    }

    const dateFormated = new Date(date + " 00:00");

    const statement = customer.statement.filter(
      (statement) =>
        statement.created_at.toDateString() ===
        new Date(dateFormated).toDateString()
    );

    if (statement.length === 0) {
      return response.status(400).json({ error: "Statement not found" });
    }

    return response.json(statement);
  }
);

app.put("/account", verifyIfExistsAccountCpfCnpj, (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  if (name === undefined || name.length === 0) {
    return response.status(400).json({ error: "Name is required" });
  }

  customer.name = name;

  return response
    .status(200)
    .json({ message: "Customer updated", customer: customer });
});

app.get("/account", verifyIfExistsAccountCpfCnpj, (request, response) => {
  const { customer } = request;
  return response.json(customer);
});

app.delete("/account", verifyIfExistsAccountCpfCnpj, (request, response) => {
  const { customer } = request;
  const balance = getBalance(customer.statement);

  if (balance !== 0) {
    return response.status(400).json({ error: "Account not empty" });
  }

  customers.splice(customer, 1);
  return response.status(204).send();
});

app.get(
  "/account/balance",
  verifyIfExistsAccountCpfCnpj,
  (request, response) => {
    const { customer } = request;
    const balance = getBalance(customer.statement);
    return response.json({ balance: balance });
  }
);

app.listen(3333);
