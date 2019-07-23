const { body, query, validationResult } = require('express-validator/check');
const logger = require('../services/logger');
const assert = require('assert');
const accounting = require('accounting');

const getRate = (base, rates, from, to) => {
    if (!rates[base]) throw 'Does not have the base tax';
    if (!rates[from]) throw "Does not have tax to the original currency";
    if (![to]) throw "Does not have tax to the final currency";
    if (from === base) return rates[to];
    if (to === base) return 1 / rates[from];
    return rates[to] * (1 / rates[from]);
};

const formatMoney = value => {
    return accounting.formatNumber(value, 2, ".", ",");
};

module.exports = app => {

    app.get('/convert', [
        query('from', 'The original currency value is required and must be 3 characters.').isLength({ min: 3, max: 3 }),
        query('to', 'The final currency value is required and must be 3 characters.').isLength({ min: 3, max: 3 }),
        query('amount', 'Value to be converted is required and must be a decimal.').isLength({ min: 1 }).isFloat()
    ], (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.info(`Validation errors: ${errors}`);
            return res.status(422).json({ errors: errors.mapped() });
        }

        const from = req.query.from.toUpperCase();
        const to = req.query.to.toUpperCase();
        const amount = req.query.amount;

        const oxrClient = new app.server.services.OxrClient();
        oxrClient.latest((errors, request, response, object) => {
            if (errors) {
                logger.info(`Errors found while fetching rates: ${errors}`);
                return res.status(422).json({ errors: errors });
            }

            const rate = getRate(object.base, object.rates, from, to);
            const result = amount * rate;

            return res.format({
                html: function () {
                    res.render('home', {
                        amount: amount,
                        from: from,
                        to: to,
                        currencies: Object.keys(object.rates),
                        convertion: `Tax: ${formatMoney(rate)} / Converter: ${formatMoney(result)}`
                    });
                },
                json: function () {
                    res.status(200).json({
                        request: {
                            query: `/convert?from=${from}&to=${to}&amount=${amount}`,
                            amount: amount,
                            from: from,
                            to: to
                        },
                        meta: {
                            timestamp: object.timestamp,
                            rate: formatMoney(rate)
                        },
                        response: formatMoney(result)
                    })
                }
            });
        });
    });

};
