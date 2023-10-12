const fs = require('fs');
const path = './keys.txt';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log('keys from keys.txt: ', data);
});

const keys = {

}


module.exports = keys