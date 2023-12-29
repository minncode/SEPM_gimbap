const mongoose = require('mongoose');

const paymentBalanceSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    balance: {
        type: String,
        required: true,
    }
});

const PaymentBalance = mongoose.model('paymentBalance', paymentBalanceSchema);

module.exports = PaymentBalance;