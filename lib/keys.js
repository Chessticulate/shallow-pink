const fs = require('fs');
const path = './scripts/keys.json';

// Create a promise-based function to read the keys from the file
async function readKeys() {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                const keys = JSON.parse(data);
                resolve(keys);
            }
        });
    });
}

module.exports = {readKeys: readKeys};
