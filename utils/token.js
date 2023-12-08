const jwt = require("jsonwebtoken");


const createToken = (id) => {
    return jwt.sign({ id }, "anythingyoulike", { expiresIn: "1d" });
};

module.exports = { createToken };
