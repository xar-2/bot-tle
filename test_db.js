const dbService = require("./node/src/services/dbService");
const isNew = dbService.trackUser(12345, "testuser");
console.log("Is New (1st run):", isNew);
const isNew2 = dbService.trackUser(12345, "testuser");
console.log("Is New (2nd run):", isNew2);
