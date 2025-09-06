const fs = require("fs");

// Recibe: nombre de archivo y texto del log
exports.generateLog = (filename, logData) => {
  fs.appendFile(filename, logData, (err) => {
    if (err) throw err;
    console.log("Log saved");
  });
};
