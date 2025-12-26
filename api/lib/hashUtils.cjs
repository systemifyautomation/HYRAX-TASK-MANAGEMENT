const crypto = require('crypto');

function hashThreeInputsJS(input1, input2, input3) {
  // Combine the three inputs into a single string
  const combined = input1.toString() + input2.toString() + input3.toString();
  
  // Create SHA-256 hash
  const hash = crypto.createHash('sha256');
  hash.update(combined);
  
  // Return hexadecimal digest
  return hash.digest('hex');
}



module.exports = { hashThreeInputsJS };

