import { query } from "../../config/database/postgres.js";

export class AuthRepository {
  async findUserByEmail(email: string) {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0];
  }

  async findUserById(userId: string) {
    const result = await query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );
    return result.rows[0];
  }
}
