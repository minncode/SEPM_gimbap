const mongoose = require('mongoose');

const bankAccountsSchema = new mongoose.Schema({
    bankAccounts: [{
        bankName: String,
        accountNumber: String,
        amount: Number
    }]
});

const BankAccount = mongoose.model('bankAccounts', bankAccountsSchema);

module.exports = BankAccount;