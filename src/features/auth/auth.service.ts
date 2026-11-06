import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../utils/errors.js";
import { AuthRepository } from "./auth.repository.js";

export class AuthService {
  constructor(private readonly authRepository = new AuthRepository()) {}

  private mapUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      avatar: user.avatar,
      school_id: user.school_id || null,
      isLogging: Boolean(user.is_logging ?? user.isFirstLogin ?? false),
      custom_role: user.custom_role || user.role,
      user_type: user.user_type || (user.role?.includes("admin") ? 1 : user.role?.includes("teacher") ? 2 : 4),
      dept: user.dept || null,
      phone: user.phone || null,
      joined: user.joined ? new Date(user.joined).toISOString().split('T')[0] : null,
      status: user.status || "Active",
      address: user.address || null,
      metadata: user.metadata || {}
    };
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const user = await this.authRepository.findUserByEmail(email.toLowerCase().trim());

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordHash = user.password_hash || user.password;

    if (!passwordHash) {
      throw new AppError("Invalid email or password", 401);
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, passwordHash);
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || "default_secret", {
      expiresIn: "7d",
    });

    return {
      token,
      user: this.mapUserResponse(user),
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return { user: this.mapUserResponse(user) };
  }

  async changePassword(userId: string, currentPass: string, newPass: string, confirmPass: string) {
    if (!currentPass || !newPass || !confirmPass) {
      throw new AppError("All password fields are required", 400);
    }

    if (newPass !== confirmPass) {
      throw new AppError("New password and confirm password do not match", 400);
    }

    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isMatch = await bcrypt.compare(currentPass, user.password_hash);
    if (!isMatch) {
      throw new AppError("Incorrect current password", 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPass, salt);

    // Update password hash and set is_logging to true
    const { query: dbQuery } = await import("../../config/database/postgres.js");
    await dbQuery(
      `UPDATE users SET password_hash = $1, is_logging = TRUE WHERE id = $2`,
      [passwordHash, userId]
    );

    return { success: true, message: "Password updated successfully" };
  }
}
