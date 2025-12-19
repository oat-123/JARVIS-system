const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
    console.log('Usage: node scripts/hash-password.js <your_password>');
    process.exit(1);
}

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        process.exit(1);
    }
    console.log('\n--- Secret JARVIS Hashing Tool ---');
    console.log('Password:', password);
    console.log('Hashed Copy:');
    console.log(hash);
    console.log('----------------------------------');
    console.log('\nCopy the "Hashed Copy" string and paste it into your Google Sheet (user sheet, column B).');
});
