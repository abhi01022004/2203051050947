const bcrypt = require("bcryptjs");

class User {
  constructor(db) {
    this.users = db.collection("users");
  }

  async create(email, password) {
    const hashed = await bcrypt.hash(password, 10);
    await this.users.insertOne({ email, password: hashed });
  }

  async find(email) {
    return this.users.findOne({ email });
  }

  async validate(email, password) {
    const user = await this.find(email);
    if (!user) return false;
    return await bcrypt.compare(password, user.password);
  }
}

module.exports = User;
