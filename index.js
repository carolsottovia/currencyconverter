const app = require('./config/express')();
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Currency converter port: ${port}.`));
