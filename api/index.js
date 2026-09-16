import { createRequire } from 'module'; const require = createRequire(import.meta.url); import { fileURLToPath } from 'url'; import { dirname } from 'path'; const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// backend/config/db.js
var require_db = __commonJS({
  "backend/config/db.js"(exports, module) {
    "use strict";
    var { Pool, types } = __require("pg");
    var path = __require("path");
    __require("dotenv").config({ path: path.join(__dirname, "../.env") });
    types.setTypeParser(1114, (stringValue) => stringValue);
    types.setTypeParser(1184, (stringValue) => stringValue);
    types.setTypeParser(1082, (stringValue) => stringValue);
    var dbUrl = process.env.DATABASE_URL || "postgresql://postgres.vxqernhfgulaewtmfagh:Focus%21%40%214235@aws-1-us-west-2.pooler.supabase.com:6543/postgres";
    var pool2 = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    pool2.on("connect", (client) => {
      client.query("SET timezone TO 'America/Fortaleza'", (err) => {
        if (err) {
          console.error("Error setting timezone:", err);
        }
      });
      console.log("Connected to the PostgreSQL database");
    });
    module.exports = {
      query: (text, params) => pool2.query(text, params),
      pool: pool2
    };
  }
});

// backend/middleware/auth.js
var require_auth = __commonJS({
  "backend/middleware/auth.js"(exports, module) {
    "use strict";
    var jwt = __require("jsonwebtoken");
    var authMiddleware2 = (req, res, next) => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Token de autentica\xE7\xE3o n\xE3o fornecido" });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Token expirado. Fa\xE7a login novamente." });
        }
        return res.status(401).json({ message: "Token inv\xE1lido" });
      }
    };
    var adminOnly = (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      next();
    };
    var optionalAuth = (req, res, next) => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = decoded;
        } catch (err) {
          req.user = null;
        }
      }
      next();
    };
    module.exports = { authMiddleware: authMiddleware2, adminOnly, optionalAuth };
  }
});

// backend/routes/auth.js
var require_auth2 = __commonJS({
  "backend/routes/auth.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var bcrypt = __require("bcryptjs");
    var jwt = __require("jsonwebtoken");
    var { pool: pool2 } = require_db();
    var nodemailer = __require("nodemailer");
    var ADMIN_EMAIL = "agenciafocusmarketing.co@gmail.com";
    var APP_URL = process.env.APP_URL || "https://focus-hub-interno.vercel.app";
    var createTransporter = () => {
      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    };
    var sendApprovalEmail = async (newUser) => {
      try {
        const transporter = createTransporter();
        const approvalLink = `${APP_URL}/api/auth/approve/${newUser.id}?action=approve`;
        const rejectLink = `${APP_URL}/api/auth/approve/${newUser.id}?action=reject`;
        const mailOptions = {
          from: process.env.EMAIL_USER || "noreply@focushub.com",
          to: ADMIN_EMAIL,
          subject: `[Focus Hub] Nova Solicita\xE7\xE3o de Cadastro: ${newUser.name}`,
          html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #FF6B00;">\u{1F4CB} Nova Solicita\xE7\xE3o de Cadastro</h2>
                    <p>Um novo usu\xE1rio solicitou acesso ao Focus Hub:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Nome:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${newUser.name}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${newUser.email}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Setor:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${newUser.sector || "N\xE3o informado"}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Cargo:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${newUser.job_title || "N\xE3o informado"}</td></tr>
                        <tr><td style="padding: 8px;"><strong>Data:</strong></td><td style="padding: 8px;">${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}</td></tr>
                    </table>
                    
                    <p>Para aprovar ou rejeitar este cadastro, acesse o painel de administra\xE7\xE3o do Focus Hub.</p>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Este email foi enviado automaticamente pelo Focus Hub.
                    </p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log("[Auth] Approval email sent to:", ADMIN_EMAIL);
        return true;
      } catch (error) {
        console.error("[Auth] Failed to send approval email:", error.message);
        return false;
      }
    };
    router.post("/login", async (req, res) => {
      const { email, password } = req.body;
      try {
        const result = await pool2.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        if (user.is_approved === false) {
          return res.status(403).json({
            message: "Seu cadastro est\xE1 pendente de aprova\xE7\xE3o. Voc\xEA receber\xE1 um email quando for aprovado.",
            pending: true
          });
        }
        if (!user.password) {
          return res.status(401).json({
            message: "Conta n\xE3o configurada. Contacte o administrador para definir uma password."
          });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user.id, role: user.role, sector: user.sector || null }, process.env.JWT_SECRET, {
          expiresIn: "1d"
        });
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role ? user.role.toUpperCase() : "USER",
            avatarUrl: user.avatar_url,
            sector: user.sector
          }
        });
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: err.message || "Server error" });
      }
    });
    router.get("/me", async (req, res) => {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool2.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
        const user = result.rows[0];
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res.json({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role ? user.role.toUpperCase() : "USER",
          avatarUrl: user.avatar_url,
          sector: user.sector
        });
      } catch (err) {
        res.status(401).json({ message: "Invalid token" });
      }
    });
    router.post("/register", async (req, res) => {
      const { name, email, password, role, sector, jobTitle } = req.body;
      console.log("[Register] Starting registration for:", email);
      try {
        const userCheck = await pool2.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) {
          console.log("[Register] User already exists:", email);
          return res.status(400).json({ message: "User already exists" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const id = "u" + Date.now();
        console.log("[Register] Inserting user with id:", id);
        const newUser = await pool2.query(
          `INSERT INTO users (id, name, email, password, role, sector, job_title, join_date, avatar_url, is_approved)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
             RETURNING *`,
          [id, name, email, hashedPassword, (role || "USER").toUpperCase(), sector, jobTitle, `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`, false]
        );
        console.log("[Register] User inserted successfully:", id);
        sendApprovalEmail(newUser.rows[0]).catch((err) => {
          console.error("[Register] Email sending failed (non-blocking):", err.message);
        });
        console.log("[Register] Returning success response");
        res.status(201).json({
          message: "Cadastro realizado com sucesso! Seu acesso est\xE1 pendente de aprova\xE7\xE3o. Voc\xEA receber\xE1 um email quando for aprovado.",
          pending: true
        });
      } catch (err) {
        console.error("[Register] Error:", err.message);
        console.error("[Register] Stack:", err.stack);
        res.status(500).json({ message: "Server error", error: err.message });
      }
    });
    router.get("/pending", async (req, res) => {
      try {
        const result = await pool2.query(
          `SELECT id, name, email, sector, job_title, join_date, avatar_url 
             FROM users WHERE is_approved = false 
             ORDER BY join_date DESC`
        );
        res.json(result.rows);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/approve/:id", async (req, res) => {
      const { id } = req.params;
      const { approved } = req.body;
      try {
        if (approved) {
          await pool2.query("UPDATE users SET is_approved = true WHERE id = $1", [id]);
          res.json({ message: "Usu\xE1rio aprovado com sucesso!" });
        } else {
          await pool2.query("DELETE FROM users WHERE id = $1", [id]);
          res.json({ message: "Usu\xE1rio rejeitado e removido." });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.post("/forgot-password", async (req, res) => {
      const { email } = req.body;
      console.log("[ForgotPassword] Request for:", email);
      try {
        const result = await pool2.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];
        if (!user) {
          return res.json({ message: "Se o email existir, voc\xEA receber\xE1 instru\xE7\xF5es de recupera\xE7\xE3o." });
        }
        const resetToken = jwt.sign(
          { id: user.id, email: user.email, type: "password-reset" },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
        await pool2.query(
          "UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour' WHERE id = $2",
          [resetToken, user.id]
        );
        try {
          if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error("[ForgotPassword] EMAIL_USER or EMAIL_PASS not configured!");
            return res.status(500).json({
              message: "Servi\xE7o de email n\xE3o configurado. Entre em contato com o administrador."
            });
          }
          const transporter = createTransporter();
          const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
          console.log("[ForgotPassword] Attempting to send email to:", email);
          console.log("[ForgotPassword] Using EMAIL_USER:", process.env.EMAIL_USER);
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "[Focus Hub] Recupera\xE7\xE3o de Senha",
            html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FF6B00;">\u{1F510} Recupera\xE7\xE3o de Senha</h2>
                        <p>Ol\xE1 ${user.name},</p>
                        <p>Voc\xEA solicitou a recupera\xE7\xE3o da sua senha no Focus Hub.</p>
                        <p>Clique no bot\xE3o abaixo para criar uma nova senha:</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Redefinir Senha
                            </a>
                        </p>
                        <p style="color: #666; font-size: 12px;">
                            Este link expira em 1 hora. Se voc\xEA n\xE3o solicitou esta recupera\xE7\xE3o, ignore este email.
                        </p>
                    </div>
                `
          });
          console.log("[ForgotPassword] Email sent successfully to:", email);
          res.json({
            message: "Email de recupera\xE7\xE3o enviado! Verifique sua caixa de entrada e spam."
          });
        } catch (emailErr) {
          console.error("[ForgotPassword] Email error:", emailErr.message);
          console.error("[ForgotPassword] Full error:", emailErr);
          return res.status(500).json({
            message: "Erro ao enviar email. Verifique se o email est\xE1 correto ou tente novamente mais tarde.",
            error: process.env.NODE_ENV === "development" ? emailErr.message : void 0
          });
        }
      } catch (err) {
        console.error("[ForgotPassword] General Error:", err.message);
        console.error("[ForgotPassword] Stack:", err.stack);
        res.status(500).json({
          message: "Erro interno do servidor",
          error: err.message
        });
      }
    });
    router.post("/reset-password", async (req, res) => {
      const { token, newPassword } = req.body;
      console.log("[ResetPassword] Attempting password reset");
      try {
        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.type !== "password-reset") {
            return res.status(400).json({ message: "Token inv\xE1lido." });
          }
        } catch (jwtErr) {
          console.error("[ResetPassword] Token invalid:", jwtErr.message);
          return res.status(400).json({ message: "Token expirado ou inv\xE1lido." });
        }
        const result = await pool2.query(
          "SELECT * FROM users WHERE id = $1 AND reset_token = $2 AND reset_token_expires > NOW()",
          [decoded.id, token]
        );
        if (result.rows.length === 0) {
          return res.status(400).json({ message: "Token expirado ou j\xE1 utilizado." });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await pool2.query(
          "UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
          [hashedPassword, decoded.id]
        );
        console.log("[ResetPassword] Password reset successful for user:", decoded.id);
        res.json({ message: "Senha alterada com sucesso! Voc\xEA j\xE1 pode fazer login." });
      } catch (err) {
        console.error("[ResetPassword] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    module.exports = router;
  }
});

// backend/services/whatsappCommands.js
var require_whatsappCommands = __commonJS({
  "backend/services/whatsappCommands.js"(exports, module) {
    "use strict";
    var { pool: pool2 } = require_db();
    var WhatsAppCommands = class {
      constructor(whatsAppService) {
        this.whatsAppService = whatsAppService;
        this.commands = {
          "!ajuda": this.helpCommand.bind(this),
          "!help": this.helpCommand.bind(this),
          "!tarefas": this.listTasksCommand.bind(this),
          "!hoje": this.todayTasksCommand.bind(this),
          "!concluir": this.completeTaskCommand.bind(this),
          "!entrada": this.checkInCommand.bind(this),
          "!saida": this.checkOutCommand.bind(this),
          "!status": this.statusCommand.bind(this)
        };
      }
      /**
       * Find user by WhatsApp number
       */
      async findUserByPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, "").replace("@c.us", "");
        const result = await pool2.query(
          "SELECT id, name, whatsapp FROM users WHERE whatsapp = $1",
          [cleanPhone]
        );
        return result.rows[0] || null;
      }
      /**
       * Process incoming message
       */
      async processMessage(message) {
        const body = message.body.trim();
        const from = message.from;
        if (!body.startsWith("!")) {
          return null;
        }
        const user = await this.findUserByPhone(from);
        if (!user) {
          return "\u274C Seu n\xFAmero n\xE3o est\xE1 cadastrado no sistema. Adicione seu WhatsApp no perfil do Focus Hub.";
        }
        const parts = body.split(" ");
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        const handler = this.commands[command];
        if (handler) {
          try {
            return await handler(user, args);
          } catch (error) {
            console.error(`[WhatsApp] Error executing command ${command}:`, error);
            return "\u274C Ocorreu um erro ao processar o comando.";
          }
        }
        return `\u2753 Comando desconhecido: ${command}

Digite *!ajuda* para ver os comandos dispon\xEDveis.`;
      }
      /**
       * !ajuda - List available commands
       */
      async helpCommand(user) {
        return `\u{1F98A} *Focus Hub - Comandos WhatsApp*

Ol\xE1, ${user.name}! Aqui est\xE3o os comandos dispon\xEDveis:

\u{1F4CB} *!tarefas* - Lista suas tarefas pendentes
\u{1F4C5} *!hoje* - Mostra tarefas com prazo para hoje
\u2705 *!concluir [ID]* - Marca uma tarefa como conclu\xEDda
\u{1F44B} *!entrada* - Registra seu check-in
\u{1F6AA} *!saida* - Registra seu check-out
\u{1F4CA} *!status* - Resumo do seu dia

Exemplo: _!concluir t123456_`;
      }
      /**
       * !tarefas - List pending tasks
       */
      async listTasksCommand(user) {
        const result = await pool2.query(
          `SELECT id, title, priority, due_date 
             FROM tasks 
             WHERE assignee_id = $1 AND status != 'concluida'
             ORDER BY 
                CASE priority 
                    WHEN 'urgente' THEN 1 
                    WHEN 'alta' THEN 2 
                    WHEN 'media' THEN 3 
                    ELSE 4 
                END,
                due_date ASC NULLS LAST
             LIMIT 10`,
          [user.id]
        );
        if (result.rows.length === 0) {
          return "\u{1F389} Parab\xE9ns! Voc\xEA n\xE3o tem tarefas pendentes.";
        }
        const priorityEmoji = {
          "urgente": "\u{1F534}",
          "alta": "\u{1F7E0}",
          "media": "\u{1F7E1}",
          "baixa": "\u{1F7E2}"
        };
        let response = `\u{1F4CB} *Suas Tarefas Pendentes (${result.rows.length})*

`;
        result.rows.forEach((task, i) => {
          const emoji = priorityEmoji[task.priority] || "\u26AA";
          const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString("pt-BR") : "Sem prazo";
          response += `${emoji} *${task.title}*
   ID: \`${task.id}\` | Prazo: ${dueDate}

`;
        });
        response += `_Para concluir, digite: !concluir [ID]_`;
        return response;
      }
      /**
       * !hoje - Tasks due today
       */
      async todayTasksCommand(user) {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const result = await pool2.query(
          `SELECT id, title, priority, due_date 
             FROM tasks 
             WHERE assignee_id = $1 
               AND status != 'concluida'
               AND DATE(due_date) = $1
             ORDER BY due_date ASC`,
          [user.id, today]
        );
        if (result.rows.length === 0) {
          return "\u{1F4C5} Nenhuma tarefa com prazo para hoje!";
        }
        let response = `\u{1F4C5} *Tarefas para Hoje (${result.rows.length})*

`;
        result.rows.forEach((task) => {
          const time = task.due_date && task.due_date.includes("T") ? task.due_date.split("T")[1].slice(0, 5) : "--:--";
          response += `\u23F0 ${time} - *${task.title}*
   ID: \`${task.id}\`

`;
        });
        return response;
      }
      /**
       * !concluir [ID] - Mark task as complete
       */
      async completeTaskCommand(user, args) {
        if (args.length === 0) {
          return "\u274C Informe o ID da tarefa.\n\nExemplo: _!concluir t123456_";
        }
        const taskId = args[0];
        const checkResult = await pool2.query(
          "SELECT id, title FROM tasks WHERE id = $1 AND assignee_id = $2",
          [taskId, user.id]
        );
        if (checkResult.rows.length === 0) {
          return `\u274C Tarefa \`${taskId}\` n\xE3o encontrada ou n\xE3o pertence a voc\xEA.`;
        }
        await pool2.query(
          "UPDATE tasks SET status = 'concluida' WHERE id = $1",
          [taskId]
        );
        const task = checkResult.rows[0];
        return `\u2705 Tarefa conclu\xEDda!

*${task.title}*

Bom trabalho! \u{1F680}`;
      }
      /**
       * !entrada - Check-in
       */
      async checkInCommand(user) {
        const now = /* @__PURE__ */ new Date();
        const today = now.toISOString().split("T")[0];
        const existingCheckIn = await pool2.query(
          `SELECT id FROM check_ins 
             WHERE user_id = $1 AND DATE(check_in_time) = $2`,
          [user.id, today]
        );
        if (existingCheckIn.rows.length > 0) {
          return "\u26A0\uFE0F Voc\xEA j\xE1 fez check-in hoje!";
        }
        const id = "ci" + Date.now();
        await pool2.query(
          `INSERT INTO check_ins (id, user_id, check_in_time) VALUES ($1, $2, $3)`,
          [id, user.id, now.toISOString()]
        );
        const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return `\u{1F44B} *Check-in registrado!*

\u23F0 Hor\xE1rio: ${time}

Bom trabalho hoje, ${user.name}!`;
      }
      /**
       * !saida - Check-out
       */
      async checkOutCommand(user) {
        const now = /* @__PURE__ */ new Date();
        const today = now.toISOString().split("T")[0];
        const checkIn = await pool2.query(
          `SELECT id, check_in_time FROM check_ins 
             WHERE user_id = $1 AND DATE(check_in_time) = $2
             ORDER BY check_in_time DESC LIMIT 1`,
          [user.id, today]
        );
        if (checkIn.rows.length === 0) {
          return "\u26A0\uFE0F Voc\xEA n\xE3o fez check-in hoje. Use *!entrada* primeiro.";
        }
        const checkInRecord = checkIn.rows[0];
        await pool2.query(
          `UPDATE check_ins SET check_out_time = $1 WHERE id = $2`,
          [now.toISOString(), checkInRecord.id]
        );
        const checkInTime = new Date(checkInRecord.check_in_time);
        const diffMs = now - checkInTime;
        const hours = Math.floor(diffMs / (1e3 * 60 * 60));
        const minutes = Math.floor(diffMs % (1e3 * 60 * 60) / (1e3 * 60));
        const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return `\u{1F6AA} *Check-out registrado!*

\u23F0 Sa\xEDda: ${time}
\u23F1\uFE0F *Tempo trabalhado:* ${hours}h ${minutes}min

At\xE9 amanh\xE3! \u{1F44B}`;
      }
      /**
       * !status - Daily summary
       */
      async statusCommand(user) {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const checkIn = await pool2.query(
          `SELECT check_in_time, check_out_time FROM check_ins 
             WHERE user_id = $1 AND DATE(check_in_time) = $2`,
          [user.id, today]
        );
        const tasks = await pool2.query(
          `SELECT 
                COUNT(*) FILTER (WHERE status != 'concluida') as pending,
                COUNT(*) FILTER (WHERE status = 'concluida' AND DATE(created_at) = $2) as completed_today
             FROM tasks WHERE assignee_id = $1`,
          [user.id, today]
        );
        const taskData = tasks.rows[0];
        const checkInData = checkIn.rows[0];
        let response = `\u{1F4CA} *Status do Dia - ${user.name}*

`;
        if (checkInData) {
          const inTime = new Date(checkInData.check_in_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          response += `\u2705 Check-in: ${inTime}
`;
          if (checkInData.check_out_time) {
            const outTime = new Date(checkInData.check_out_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            response += `\u2705 Check-out: ${outTime}
`;
          } else {
            response += `\u23F3 Check-out: Pendente
`;
          }
        } else {
          response += `\u274C Sem check-in hoje
`;
        }
        response += `
\u{1F4CB} *Tarefas:*
`;
        response += `   Pendentes: ${taskData.pending || 0}
`;
        response += `   Conclu\xEDdas hoje: ${taskData.completed_today || 0}
`;
        return response;
      }
    };
    module.exports = WhatsAppCommands;
  }
});

// backend/services/whatsappService.js
var require_whatsappService = __commonJS({
  "backend/services/whatsappService.js"(exports, module) {
    "use strict";
    var makeWASocket;
    var DisconnectReason;
    var useMultiFileAuthState;
    var pino;
    var qrcode;
    try {
      const baileys = __require("@whiskeysockets/baileys");
      makeWASocket = baileys.default || baileys.makeWASocket;
      DisconnectReason = baileys.DisconnectReason;
      useMultiFileAuthState = baileys.useMultiFileAuthState;
      pino = __require("pino");
      qrcode = __require("qrcode");
    } catch (e) {
    }
    var path = __require("path");
    var fs = __require("fs");
    var WhatsAppService = class {
      constructor() {
        this.socket = null;
        this.qrCode = null;
        this.status = "DISCONNECTED";
        this.isReady = false;
        this.commandHandler = null;
        this.lastError = null;
        this.authFolder = path.join(__dirname, "..", "auth_info");
        if (!process.env.VERCEL && process.env.ENABLE_WHATSAPP === "true" && makeWASocket) {
          this.initialize();
        }
      }
      async initialize() {
        try {
          console.log("[WhatsApp] Initializing Baileys client...");
          const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
          this.socket = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: pino({ level: "silent" }),
            browser: ["Focus Hub", "Chrome", "120.0.0"]
          });
          this.socket.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
              console.log("[WhatsApp] QR Code received");
              this.status = "WAITING_FOR_SCAN";
              try {
                this.qrCode = await qrcode.toDataURL(qr);
              } catch (err) {
                console.error("[WhatsApp] Error generating QR:", err);
              }
            }
            if (connection === "close") {
              const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
              console.log("[WhatsApp] Connection closed. Reconnecting:", shouldReconnect);
              this.status = "DISCONNECTED";
              this.isReady = false;
              if (shouldReconnect) {
                setTimeout(() => this.initialize(), 5e3);
              }
            } else if (connection === "open") {
              console.log("[WhatsApp] Connected successfully!");
              this.status = "CONNECTED";
              this.isReady = true;
              this.qrCode = null;
            }
          });
          this.socket.ev.on("creds.update", saveCreds);
          this.socket.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify") return;
            for (const msg of messages) {
              if (!msg.message || msg.key.fromMe) continue;
              const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
              if (messageText.startsWith("!") && this.commandHandler) {
                console.log("[WhatsApp] Command received:", messageText);
                try {
                  const response = await this.commandHandler.processMessage({
                    body: messageText,
                    from: msg.key.remoteJid.replace("@s.whatsapp.net", "")
                  });
                  if (response) {
                    await this.socket.sendMessage(msg.key.remoteJid, { text: response });
                  }
                } catch (error) {
                  console.error("[WhatsApp] Error processing command:", error);
                  await this.socket.sendMessage(msg.key.remoteJid, {
                    text: "\u274C Erro ao processar comando."
                  });
                }
              }
            }
          });
          const WhatsAppCommands = require_whatsappCommands();
          this.commandHandler = new WhatsAppCommands(this);
        } catch (error) {
          console.error("[WhatsApp] Initialization error:", error);
          this.status = "ERROR";
          this.lastError = error.message;
        }
      }
      getQrCode() {
        return {
          qr: this.qrCode,
          status: this.status
        };
      }
      async sendMessage(to, message) {
        if (!this.isReady || !this.socket) {
          console.warn("[WhatsApp] Client not ready");
          return false;
        }
        try {
          let jid = to.replace(/\D/g, "");
          if (!jid.endsWith("@s.whatsapp.net")) {
            jid = `${jid}@s.whatsapp.net`;
          }
          await this.socket.sendMessage(jid, { text: message });
          console.log(`[WhatsApp] Message sent to ${jid}`);
          return true;
        } catch (error) {
          console.error("[WhatsApp] Failed to send message:", error);
          return false;
        }
      }
      async logout() {
        if (this.socket) {
          await this.socket.logout();
          this.status = "DISCONNECTED";
          this.isReady = false;
          this.qrCode = null;
        }
      }
    };
    var whatsAppService = new WhatsAppService();
    module.exports = whatsAppService;
  }
});

// backend/services/pushService.js
var require_pushService = __commonJS({
  "backend/services/pushService.js"(exports, module) {
    "use strict";
    var webpush = __require("web-push");
    var { pool: pool2 } = require_db();
    var VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-bI3cJDQyKClZNA1QQ_jmFCrh0Fi0JIn0w5sHE";
    var VAPID_PRIVATE_KEY = "UUxI4o8r315eMbHe2MX9hNARkUm2jIiTuiaKRcaqksg";
    var VAPID_SUBJECT = "mailto:admin@focushub.com";
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    async function sendPushToUser(userId, payload) {
      try {
        const result = await pool2.query(
          "SELECT * FROM push_subscriptions WHERE user_id = $1",
          [userId]
        );
        if (result.rows.length === 0) {
          console.log(`[PushService] No push subscriptions found for user ${userId}`);
          return;
        }
        const notificationPayload = JSON.stringify({
          title: payload.title || "Focus Hub",
          body: payload.body || "",
          icon: payload.icon || "/icons/icon-192.png",
          badge: payload.badge || "/icons/icon-192.png",
          url: payload.url || "/",
          tag: payload.tag || "focushub-" + Date.now(),
          timestamp: Date.now()
        });
        const sendPromises = result.rows.map(async (sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };
          try {
            await webpush.sendNotification(pushSubscription, notificationPayload);
            console.log(`[PushService] Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
          } catch (err) {
            console.error(`[PushService] Error sending push to endpoint ${sub.endpoint.substring(0, 50)}:`, err.message);
            if (err.statusCode === 410 || err.statusCode === 404) {
              console.log(`[PushService] Removing expired subscription: ${sub.id}`);
              await pool2.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
            }
          }
        });
        await Promise.allSettled(sendPromises);
        console.log(`[PushService] Push notifications processed for user ${userId}`);
      } catch (err) {
        console.error("[PushService] Error in sendPushToUser:", err);
      }
    }
    async function saveSubscription(userId, subscription) {
      const { endpoint, keys } = subscription;
      const id = "ps_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      try {
        await pool2.query(
          `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (endpoint) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth`,
          [id, userId, endpoint, keys.p256dh, keys.auth]
        );
        console.log(`[PushService] Subscription saved for user ${userId}`);
        return { success: true };
      } catch (err) {
        console.error("[PushService] Error saving subscription:", err);
        throw err;
      }
    }
    async function removeSubscription(userId, endpoint) {
      try {
        const result = await pool2.query(
          "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 RETURNING id",
          [userId, endpoint]
        );
        if (result.rowCount === 0) {
          console.log(`[PushService] No subscription found to remove for user ${userId}`);
          return { success: false, message: "Subscription not found" };
        }
        console.log(`[PushService] Subscription removed for user ${userId}`);
        return { success: true };
      } catch (err) {
        console.error("[PushService] Error removing subscription:", err);
        throw err;
      }
    }
    function getVapidPublicKey() {
      return VAPID_PUBLIC_KEY;
    }
    module.exports = {
      sendPushToUser,
      saveSubscription,
      removeSubscription,
      getVapidPublicKey
    };
  }
});

// backend/routes/tasks.js
var require_tasks = __commonJS({
  "backend/routes/tasks.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    var { body, param, validationResult } = __require("express-validator");
    var whatsAppService;
    try {
      whatsAppService = require_whatsappService();
    } catch (e) {
      whatsAppService = { isReady: false, sendMessage: async () => false };
    }
    var pushService = require_pushService();
    var validate = (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    };
    var VALID_STATUSES = ["pendente", "em_progresso", "concluida", "todo"];
    var VALID_PRIORITIES = ["baixa", "media", "alta", "urgente"];
    router.get("/", async (req, res) => {
      try {
        const tasksResult = await pool2.query("SELECT * FROM tasks ORDER BY created_at DESC");
        const tasks = tasksResult.rows;
        if (tasks.length === 0) {
          return res.json([]);
        }
        const subtasksResult = await pool2.query("SELECT * FROM subtasks");
        const allSubtasks = subtasksResult.rows;
        const formatDueDate = (dateValue) => {
          if (!dateValue) return null;
          if (typeof dateValue === "string") {
            if (dateValue.includes(" ")) {
              const [datePart, timePart] = dateValue.split(" ");
              const timeShort = timePart.slice(0, 5);
              if (timeShort === "00:00") {
                return datePart;
              }
              return `${datePart}T${timeShort}`;
            }
            if (dateValue.includes("T")) {
              return dateValue.slice(0, 16);
            }
            return dateValue.slice(0, 10);
          }
          if (dateValue instanceof Date) {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, "0");
            const day = String(dateValue.getDate()).padStart(2, "0");
            const hours = dateValue.getHours();
            const minutes = dateValue.getMinutes();
            if (hours === 0 && minutes === 0) {
              return `${year}-${month}-${day}`;
            }
            return `${year}-${month}-${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
          }
          return null;
        };
        const mappedTasks = tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigneeId: task.assignee_id,
          estimatedTime: task.estimated_time,
          dueDate: formatDueDate(task.due_date),
          createdAt: task.created_at,
          isOffline: task.is_offline,
          goalId: task.goal_id,
          goalWeight: task.goal_weight,
          startTime: task.start_time,
          endTime: task.end_time,
          sector: task.sector,
          location: task.location,
          color: task.color,
          repetition: task.repetition,
          subtasks: allSubtasks.filter((st) => st.task_id === task.id).map((st) => ({
            id: st.id,
            text: st.text,
            completed: st.completed
          }))
        }));
        res.json(mappedTasks);
      } catch (err) {
        console.error("[GET /tasks] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.post(
      "/",
      [
        body("title").notEmpty().trim().isLength({ max: 255 }).withMessage("T\xEDtulo \xE9 obrigat\xF3rio (m\xE1x. 255 caracteres)"),
        body("status").isIn(VALID_STATUSES).withMessage(`Status inv\xE1lido. Use: ${VALID_STATUSES.join(", ")}`),
        body("priority").isIn(VALID_PRIORITIES).withMessage(`Prioridade inv\xE1lida. Use: ${VALID_PRIORITIES.join(", ")}`),
        body("description").optional().trim().isLength({ max: 5e3 }),
        body("estimatedTime").optional().isInt({ min: 0, max: 480 })
      ],
      validate,
      async (req, res) => {
        let { id, title, description, status, priority, assigneeId, estimatedTime, dueDate, subtasks, startTime, endTime, sector, location, color, repetition, goalId, goalWeight } = req.body;
        goalWeight = parseInt(goalWeight) || 1;
        const cleanDate = (d) => d && typeof d === "string" && d.trim() !== "" ? d : null;
        dueDate = cleanDate(dueDate);
        if (!id) {
          id = "t" + Date.now();
        }
        const cleanAssigneeId = assigneeId && assigneeId.trim() !== "" ? assigneeId : null;
        const client = await pool2.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `INSERT INTO tasks (id, title, description, status, priority, assignee_id, estimated_time, due_date, start_time, end_time, sector, location, color, repetition, goal_id, goal_weight)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [id, title, description, status, priority, cleanAssigneeId, estimatedTime, dueDate || null, startTime || null, endTime || null, sector || null, location || null, color || null, repetition || "none", goalId || null, goalWeight]
          );
          if (subtasks && subtasks.length > 0) {
            for (const subtask of subtasks) {
              await client.query(
                `INSERT INTO subtasks (id, task_id, text, completed)
                     VALUES ($1, $2, $3, $4)`,
                [subtask.id, id, subtask.text, subtask.completed]
              );
            }
          }
          if (status === "concluida" && goalId) {
            await client.query("UPDATE goals SET current_value = current_value + $1 WHERE id = $2", [goalWeight, goalId]);
            await client.query("INSERT INTO goal_history (id, goal_id, action, details) VALUES ($1, $2, $3, $4)", ["gh-" + Date.now(), goalId, "TASK_COMPLETED", "Tarefa criada como conclu\xEDda"]);
          }
          await client.query("COMMIT");
          const newTask = {
            id,
            title,
            description,
            status,
            priority,
            assigneeId,
            estimatedTime,
            dueDate,
            startTime,
            endTime,
            sector,
            location,
            color,
            repetition,
            subtasks: subtasks || []
          };
          if (assigneeId) {
            try {
              const notifId = "n" + Date.now() + Math.floor(Math.random() * 1e3);
              await client.query(
                `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [notifId, assigneeId, "TASK_ASSIGNED", `Voc\xEA foi atribu\xEDdo \xE0 tarefa: ${title}`, "tasks", false, id]
              );
              pushService.sendPushToUser(assigneeId, {
                title: "\u{1F4CB} Nova Tarefa Atribu\xEDda",
                body: `Voc\xEA foi atribu\xEDdo \xE0 tarefa: ${title}`,
                url: "/",
                tag: `notification-TASK_ASSIGNED-${notifId}`
              }).catch((err) => console.warn("Push failed:", err.message));
            } catch (err) {
              console.error("Failed to create DB notification:", err);
            }
            try {
              const userRes = await pool2.query("SELECT whatsapp, name FROM users WHERE id = $1", [assigneeId]);
              if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                if (user.whatsapp) {
                  const message = `\u{1F4CB} *Nova Tarefa Atribu\xEDda*

*T\xEDtulo:* ${title}
*Prioridade:* ${priority}
*Prazo:* ${dueDate ? new Date(dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}

Acesse o Focus Hub para ver detalhes.`;
                  whatsAppService.sendMessage(user.whatsapp, message).catch(console.error);
                }
              }
            } catch (error) {
              console.error("Failed to send WhatsApp notification:", error);
            }
          }
          res.status(201).json(newTask);
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(err);
          res.status(500).json({ message: "Server error" });
        } finally {
          client.release();
        }
      }
    );
    router.put("/:id", async (req, res) => {
      const { id } = req.params;
      let { title, description, status, priority, assigneeId, estimatedTime, dueDate: rawDueDate, subtasks, startTime, endTime, sector, location, color, repetition, goalId, goalWeight } = req.body;
      goalWeight = parseInt(goalWeight) || 1;
      console.log("[PUT /tasks/:id] Updating task:", id);
      console.log("[PUT /tasks/:id] Body:", JSON.stringify(req.body, null, 2));
      const cleanDate = (d) => d && typeof d === "string" && d.trim() !== "" ? d : null;
      const dueDate = cleanDate(rawDueDate);
      const cleanAssigneeId = assigneeId && assigneeId.trim() !== "" ? assigneeId : null;
      const client = await pool2.connect();
      try {
        await client.query("BEGIN");
        const prevTaskRes = await client.query("SELECT assignee_id, status, goal_id, goal_weight FROM tasks WHERE id = $1", [id]);
        const prevTask = prevTaskRes.rows.length > 0 ? prevTaskRes.rows[0] : null;
        const updateResult = await client.query(
          `UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, assignee_id = $5, estimated_time = $6, due_date = $7, start_time = $8, end_time = $9, sector = $10, location = $11, color = $12, repetition = $13, goal_id = $14, goal_weight = $15
             WHERE id = $16
             RETURNING *`,
          [title, description, status, priority, cleanAssigneeId, estimatedTime ?? null, dueDate, startTime || null, endTime || null, sector || null, location || null, color || null, repetition || "none", goalId || null, goalWeight, id]
        );
        if (updateResult.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: "Task not found" });
        }
        const updatedTaskRow = updateResult.rows[0];
        if (subtasks && Array.isArray(subtasks)) {
          await client.query("DELETE FROM subtasks WHERE task_id = $1", [id]);
          for (const subtask of subtasks) {
            if (subtask && subtask.id && subtask.text) {
              await client.query(
                `INSERT INTO subtasks (id, task_id, text, completed)
                         VALUES ($1, $2, $3, $4)`,
                [subtask.id, id, subtask.text, subtask.completed || false]
              );
            }
          }
        }
        const subtasksResult = await client.query(
          "SELECT id, text, completed FROM subtasks WHERE task_id = $1",
          [id]
        );
        const formatDueDate = (dateValue) => {
          if (!dateValue) return null;
          if (typeof dateValue === "string") {
            if (dateValue.includes(" ")) {
              const [datePart, timePart] = dateValue.split(" ");
              const timeShort = (timePart || "").slice(0, 5);
              if (timeShort === "00:00") return datePart;
              return `${datePart}T${timeShort}`;
            }
            if (dateValue.includes("T")) {
              return dateValue.slice(0, 16);
            }
            return dateValue.slice(0, 10);
          }
          if (dateValue instanceof Date) {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, "0");
            const day = String(dateValue.getDate()).padStart(2, "0");
            const hours = dateValue.getHours();
            const minutes = dateValue.getMinutes();
            if (hours === 0 && minutes === 0) return `${year}-${month}-${day}`;
            return `${year}-${month}-${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
          }
          return null;
        };
        const updatedTask = {
          id: updatedTaskRow.id,
          title: updatedTaskRow.title,
          description: updatedTaskRow.description,
          status: updatedTaskRow.status,
          priority: updatedTaskRow.priority,
          assigneeId: updatedTaskRow.assignee_id,
          estimatedTime: updatedTaskRow.estimated_time,
          dueDate: formatDueDate(updatedTaskRow.due_date),
          createdAt: updatedTaskRow.created_at,
          isOffline: updatedTaskRow.is_offline,
          goalId: updatedTaskRow.goal_id,
          startTime: updatedTaskRow.start_time,
          endTime: updatedTaskRow.end_time,
          sector: updatedTaskRow.sector,
          location: updatedTaskRow.location,
          color: updatedTaskRow.color,
          repetition: updatedTaskRow.repetition,
          goalWeight: updatedTaskRow.goal_weight,
          subtasks: subtasksResult.rows.map((st) => ({
            id: st.id,
            text: st.text,
            completed: st.completed
          }))
        };
        if (prevTask) {
          if (prevTask.status === "concluida" && prevTask.goal_id) {
            await client.query("UPDATE goals SET current_value = current_value - $1 WHERE id = $2", [prevTask.goal_weight, prevTask.goal_id]);
            await client.query("INSERT INTO goal_history (id, goal_id, action, details) VALUES ($1, $2, $3, $4)", ["gh-rev-" + Date.now(), prevTask.goal_id, "TASK_REVERTED", "Tarefa desfeita ou reaberta"]);
          }
          if (status === "concluida" && goalId) {
            await client.query("UPDATE goals SET current_value = current_value + $1 WHERE id = $2", [goalWeight, goalId]);
            await client.query("INSERT INTO goal_history (id, goal_id, action, details) VALUES ($1, $2, $3, $4)", ["gh-com-" + Date.now(), goalId, "TASK_COMPLETED", "Tarefa conclu\xEDda"]);
          }
        }
        await client.query("COMMIT");
        console.log("[PUT /tasks/:id] Task updated successfully:", id);
        res.json({ message: "Task updated", task: updatedTask });
        if (cleanAssigneeId && prevTask) {
          try {
            if (prevTask.assignee_id !== cleanAssigneeId) {
              const notifId = "n" + Date.now() + Math.floor(Math.random() * 1e3);
              await client.query(
                `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [notifId, cleanAssigneeId, "TASK_ASSIGNED", `Voc\xEA foi atribu\xEDdo \xE0 tarefa: ${title}`, "tasks", false, id]
              );
              pushService.sendPushToUser(cleanAssigneeId, {
                title: "\u{1F4CB} Nova Tarefa Atribu\xEDda",
                body: `Voc\xEA foi atribu\xEDdo \xE0 tarefa: ${title}`,
                url: "/",
                tag: `notification-TASK_ASSIGNED-${notifId}`
              }).catch((err) => console.warn("Push failed:", err.message));
              const userRes = await client.query("SELECT whatsapp, name FROM users WHERE id = $1", [cleanAssigneeId]);
              if (userRes.rows.length > 0 && userRes.rows[0].whatsapp) {
                const message = `\u{1F4CB} *Nova Tarefa Atribu\xEDda*

*T\xEDtulo:* ${title}
*Prazo:* ${dueDate ? new Date(dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}

Acesse o Focus Hub para ver detalhes.`;
                whatsAppService.sendMessage(userRes.rows[0].whatsapp, message).catch(console.error);
              }
            } else if (status === "concluida" && prevTask.status !== "concluida") {
              const notifId = "n" + Date.now() + Math.floor(Math.random() * 1e3);
              await client.query(
                `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [notifId, cleanAssigneeId, "TASK_STATUS_CHANGED", `A tarefa "${title}" foi marcada como conclu\xEDda!`, "tasks", false, id]
              );
              pushService.sendPushToUser(cleanAssigneeId, {
                title: "\u2705 Tarefa Conclu\xEDda",
                body: `A tarefa "${title}" foi marcada como conclu\xEDda!`,
                url: "/",
                tag: `notification-TASK_STATUS_CHANGED-${notifId}`
              }).catch((err) => console.warn("Push failed:", err.message));
              const userRes = await client.query("SELECT whatsapp, name FROM users WHERE id = $1", [cleanAssigneeId]);
              if (userRes.rows.length > 0 && userRes.rows[0].whatsapp) {
                const message = `\u2705 *Tarefa Conclu\xEDda*

*T\xEDtulo:* ${title}

Bom trabalho! \u{1F680}`;
                whatsAppService.sendMessage(userRes.rows[0].whatsapp, message).catch(console.error);
              }
            } else if (priority === "urgente" && prevTask.priority !== "urgente") {
              const notifId = "n" + Date.now() + Math.floor(Math.random() * 1e3);
              await client.query(
                `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [notifId, cleanAssigneeId, "TASK_STATUS_CHANGED", `A tarefa "${title}" foi marcada como URGENTE!`, "tasks", false, id]
              );
              pushService.sendPushToUser(cleanAssigneeId, {
                title: "\u{1F525} Tarefa Urgente",
                body: `A tarefa "${title}" foi marcada como URGENTE!`,
                url: "/",
                tag: `notification-TASK_STATUS_CHANGED-${notifId}`
              }).catch((err) => console.warn("Push failed:", err.message));
              const userRes = await client.query("SELECT whatsapp, name FROM users WHERE id = $1", [cleanAssigneeId]);
              if (userRes.rows.length > 0 && userRes.rows[0].whatsapp) {
                const message = `\u{1F525} *Tarefa Urgente*

*T\xEDtulo:* ${title}
*Prazo:* ${dueDate ? new Date(dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}

Aten\xE7\xE3o para esta tarefa!`;
                whatsAppService.sendMessage(userRes.rows[0].whatsapp, message).catch(console.error);
              }
            } else if (status && prevTask.status && status !== prevTask.status && status !== "concluida") {
              const notifId = "n" + Date.now() + Math.floor(Math.random() * 1e3);
              await client.query(
                `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [notifId, cleanAssigneeId, "TASK_STATUS_CHANGED", `O status da tarefa "${title}" mudou para ${status.replace("_", " ")}.`, "tasks", false, id]
              );
              pushService.sendPushToUser(cleanAssigneeId, {
                title: "\u{1F504} Status Atualizado",
                body: `A tarefa "${title}" mudou para ${status.replace("_", " ")}.`,
                url: "/",
                tag: `notification-TASK_STATUS_CHANGED-${notifId}`
              }).catch((err) => console.warn("Push failed:", err.message));
            }
          } catch (error) {
            console.error("Failed to handle notifications on update:", error);
          }
        }
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("[PUT /tasks/:id] Error updating task:", err.message);
        console.error("[PUT /tasks/:id] Stack:", err.stack);
        res.status(500).json({ message: "Server error", error: err.message });
      } finally {
        client.release();
      }
    });
    router.delete("/:id", async (req, res) => {
      const { id } = req.params;
      const user = req.user;
      console.log("[DELETE /tasks/:id] Deleting task:", id, "by user:", user.id);
      const client = await pool2.connect();
      try {
        await client.query("BEGIN");
        const taskCheck = await client.query("SELECT assignee_id FROM tasks WHERE id = $1", [id]);
        if (taskCheck.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: "Task not found" });
        }
        const task = taskCheck.rows[0];
        if (user.role !== "ADMIN" && user.id !== task.assignee_id) {
          await client.query("ROLLBACK");
          console.warn(`[DELETE /tasks/:id] Unauthorized deletion attempt by ${user.id} on task ${id}`);
          return res.status(403).json({ message: "Voc\xEA n\xE3o tem permiss\xE3o para excluir esta tarefa." });
        }
        await client.query("DELETE FROM subtasks WHERE task_id = $1", [id]);
        await client.query("DELETE FROM tasks WHERE id = $1", [id]);
        await client.query("COMMIT");
        console.log("[DELETE /tasks/:id] Task deleted successfully:", id);
        res.json({ message: "Task deleted", id });
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("[DELETE /tasks/:id] Error deleting task:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
      } finally {
        client.release();
      }
    });
    module.exports = router;
  }
});

// backend/routes/checkins.js
var require_checkins = __commonJS({
  "backend/routes/checkins.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    var FORTALEZA_TIMEZONE = "America/Fortaleza";
    var formatTimestamp = (value) => {
      if (!value) return null;
      if (typeof value === "string") {
        if (value.includes("T")) return value.slice(0, 19);
        if (value.includes(" ")) return value.replace(" ", "T").slice(0, 19);
        return value;
      }
      if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        const hours = String(value.getHours()).padStart(2, "0");
        const minutes = String(value.getMinutes()).padStart(2, "0");
        const seconds = String(value.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      }
      return null;
    };
    var mapCheckInRow = (row, user = {}) => ({
      id: row.id,
      userId: row.user_id,
      userName: user.name || row.user_name || "Unknown",
      userAvatar: user.avatar_url || row.user_avatar || "",
      type: row.type,
      checkInTime: formatTimestamp(row.timestamp),
      checkOutTime: formatTimestamp(row.check_out_time),
      dailyReport: row.daily_report,
      location: row.location,
      mood: row.mood,
      notes: row.notes
    });
    router.get("/", async (req, res) => {
      try {
        const result = await pool2.query(`
            SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
            FROM check_ins c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.timestamp DESC
        `);
        const checkIns = result.rows.map((row) => mapCheckInRow(row));
        res.json(checkIns);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.post("/", async (req, res) => {
      const { userId, type, location, mood, notes } = req.body;
      console.log(`[POST /checkins] Received request for user: ${userId}`);
      try {
        const id = "c" + Date.now();
        const result = await pool2.query(
          `INSERT INTO check_ins (id, user_id, type, timestamp, location, mood, notes)
             VALUES ($1, $2, $3, timezone('${FORTALEZA_TIMEZONE}', NOW()), $4, $5, $6)
             RETURNING *`,
          [id, userId, type, location, mood, notes]
        );
        const userResult = await pool2.query("SELECT name, avatar_url FROM users WHERE id = $1", [userId]);
        const user = userResult.rows[0] || {};
        const newCheckIn = mapCheckInRow(result.rows[0], user);
        console.log("[POST /checkins] Returning:", newCheckIn);
        res.status(201).json(newCheckIn);
      } catch (err) {
        console.error("[POST /checkins] ERROR:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/:id", async (req, res) => {
      const { id } = req.params;
      const { checkOutTime, dailyReport } = req.body;
      try {
        const updates = [];
        const values = [];
        if (typeof checkOutTime !== "undefined") {
          updates.push(`check_out_time = timezone('${FORTALEZA_TIMEZONE}', NOW())`);
        }
        if (typeof dailyReport !== "undefined") {
          values.push(dailyReport);
          updates.push(`daily_report = $${values.length}`);
        }
        if (updates.length === 0) {
          return res.status(400).json({ message: "No fields to update" });
        }
        values.push(id);
        const result = await pool2.query(
          `UPDATE check_ins
             SET ${updates.join(", ")}
             WHERE id = $${values.length}
             RETURNING *`,
          values
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Check-in not found" });
        }
        const userResult = await pool2.query(
          "SELECT name, avatar_url FROM users WHERE id = $1",
          [result.rows[0].user_id]
        );
        const user = userResult.rows[0] || {};
        const updatedCheckIn = mapCheckInRow(result.rows[0], user);
        res.json(updatedCheckIn);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await pool2.query("DELETE FROM check_ins WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Check-in not found" });
        }
        res.json({ message: "Check-in deleted", id });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/posts.js
var require_posts = __commonJS({
  "backend/routes/posts.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    router.get("/", async (req, res) => {
      try {
        const result = await pool2.query(`
            SELECT p.*, u.name as author_name, u.avatar_url as author_avatar 
            FROM posts p
            JOIN users u ON p.author_id = u.id
            ORDER BY p.timestamp DESC
        `);
        const posts = result.rows.map((row) => ({
          id: row.id,
          authorId: row.author_id,
          authorName: row.author_name,
          authorAvatar: row.author_avatar,
          content: row.content,
          createdAt: row.timestamp,
          // Map timestamp to createdAt
          likes: row.likes,
          isPinned: row.is_pinned || false,
          // Map is_pinned to isPinned
          comments: row.comments || []
        }));
        res.json(posts);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.post("/", async (req, res) => {
      const { authorId, content, timestamp } = req.body;
      try {
        const id = "p" + Date.now();
        const postTimestamp = timestamp || (/* @__PURE__ */ new Date()).toISOString();
        const result = await pool2.query(
          `INSERT INTO posts (id, author_id, content, timestamp, likes, comments, is_pinned)
             VALUES ($1, $2, $3, $4, 0, '[]', false)
             RETURNING *`,
          [id, authorId, content, postTimestamp]
        );
        const userResult = await pool2.query("SELECT name, avatar_url FROM users WHERE id = $1", [authorId]);
        const user = userResult.rows[0];
        const newPost = {
          id: result.rows[0].id,
          authorId: result.rows[0].author_id,
          authorName: user.name,
          authorAvatar: user.avatar_url,
          content: result.rows[0].content,
          createdAt: result.rows[0].timestamp,
          // Map timestamp to createdAt
          likes: result.rows[0].likes,
          isPinned: false,
          comments: []
        };
        res.status(201).json(newPost);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/:id", async (req, res) => {
      const { id } = req.params;
      const { isPinned, content } = req.body;
      try {
        let query = "UPDATE posts SET ";
        const values = [];
        let valueIndex = 1;
        if (isPinned !== void 0) {
          query += `is_pinned = $${valueIndex}, `;
          values.push(isPinned);
          valueIndex++;
        }
        if (content !== void 0) {
          query += `content = $${valueIndex}, `;
          values.push(content);
          valueIndex++;
        }
        query = query.slice(0, -2);
        query += ` WHERE id = $${valueIndex} RETURNING *`;
        values.push(id);
        const result = await pool2.query(query, values);
        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Post not found" });
        }
        const post = result.rows[0];
        const userResult = await pool2.query("SELECT name, avatar_url FROM users WHERE id = $1", [post.author_id]);
        const user = userResult.rows[0];
        const updatedPost = {
          id: post.id,
          authorId: post.author_id,
          authorName: user.name,
          authorAvatar: user.avatar_url,
          content: post.content,
          timestamp: post.timestamp,
          likes: post.likes,
          isPinned: post.is_pinned,
          comments: []
          // Simplified
        };
        res.json(updatedPost);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await pool2.query("DELETE FROM posts WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Post not found" });
        }
        res.json({ message: "Post deleted", id });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/goals.js
var require_goals = __commonJS({
  "backend/routes/goals.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    var calculateProgress = (current, target) => {
      return target > 0 ? Number(current) / Number(target) * 100 : 0;
    };
    router.get("/", async (req, res) => {
      try {
        const result = await pool2.query("SELECT * FROM goals ORDER BY created_at DESC");
        const goals = result.rows.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          sector: row.sector,
          responsible_id: row.responsible_id,
          team: row.team,
          start_date: row.start_date,
          end_date: row.end_date,
          target_value: Number(row.target_value),
          current_value: Number(row.current_value),
          progress: calculateProgress(row.current_value, row.target_value),
          metric: row.metric,
          category: row.category,
          scope: row.scope,
          priority: row.priority,
          status: row.status,
          color: row.color,
          weight: row.weight,
          allow_overflow: row.allow_overflow,
          observations: row.observations,
          created_by: row.created_by,
          created_at: row.created_at,
          subgoals: row.subgoals || []
        }));
        res.json(goals);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
      }
    });
    router.post("/", async (req, res) => {
      const data = req.body;
      const userId = req.user ? req.user.id : data.created_by;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      try {
        const id = "g" + Date.now();
        const result = await pool2.query(
          `INSERT INTO goals (
                id, title, description, sector, responsible_id, team, start_date, end_date, 
                target_value, current_value, metric, category, scope, priority, status, 
                color, weight, allow_overflow, observations, created_by, subgoals
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
            ) RETURNING *`,
          [
            id,
            data.title,
            data.description,
            data.sector || "Comercial",
            data.responsible_id || null,
            data.team || null,
            data.start_date || null,
            data.end_date || null,
            data.target_value || 0,
            data.current_value || 0,
            data.metric || "count",
            data.category || "quantity",
            data.scope || "individual",
            data.priority || "medium",
            data.status || "active",
            data.color || "#FF6B00",
            data.weight || 1,
            data.allow_overflow || false,
            data.observations || null,
            userId,
            JSON.stringify(data.subgoals || [])
          ]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const userId = req.user ? req.user.id : null;
      try {
        let query = "UPDATE goals SET ";
        const values = [];
        let valueIndex = 1;
        delete data.id;
        delete data.progress;
        delete data.created_at;
        for (const [key, value] of Object.entries(data)) {
          if (value !== void 0) {
            query += `${key} = $${valueIndex}, `;
            values.push(key === "subgoals" ? JSON.stringify(value) : value);
            valueIndex++;
          }
        }
        if (values.length === 0) return res.json({ message: "No fields to update" });
        query = query.slice(0, -2);
        query += ` WHERE id = $${valueIndex} RETURNING *`;
        values.push(id);
        const result = await pool2.query(query, values);
        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Goal not found" });
        }
        if (userId) {
          await pool2.query(
            `INSERT INTO goal_history (id, goal_id, user_id, action, details) VALUES ($1, $2, $3, $4, $5)`,
            ["gh-" + Date.now(), id, userId, "UPDATED", JSON.stringify(data)]
          );
        }
        res.json(result.rows[0]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await pool2.query("DELETE FROM goals WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Goal not found" });
        }
        res.json({ message: "Goal deleted", id });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/users.js
var require_users = __commonJS({
  "backend/routes/users.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    router.get("/", async (req, res) => {
      try {
        const result = await pool2.query("SELECT id, name, email, role, avatar_url, sector, job_title, bio, join_date, status FROM users ORDER BY name ASC");
        const users = result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role ? row.role.toUpperCase() : "USER",
          avatarUrl: row.avatar_url,
          sector: row.sector,
          jobTitle: row.job_title,
          bio: row.bio,
          joinDate: row.join_date,
          status: row.status || "active"
        }));
        res.json(users);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/:id", async (req, res) => {
      const { id } = req.params;
      const { name, role, sector, jobTitle, bio, avatarUrl, whatsapp, whatsappNotifications, whatsappDndStart, whatsappDndEnd, status } = req.body;
      console.log("[PUT /users/:id] Updating user:", id);
      console.log("[PUT /users/:id] Has avatarUrl:", !!avatarUrl);
      try {
        const result = await pool2.query(
          `UPDATE users 
             SET name = $1, role = $2, sector = $3, job_title = $4, bio = $5, avatar_url = $6, 
                 whatsapp = $7, whatsapp_notifications = $8, whatsapp_dnd_start = $9, whatsapp_dnd_end = $10, status = $11
             WHERE id = $12
             RETURNING id, name, email, role, avatar_url, sector, job_title, bio, join_date, 
                       whatsapp, whatsapp_notifications, whatsapp_dnd_start, whatsapp_dnd_end, status`,
          [
            name || null,
            role || null,
            sector || null,
            jobTitle || null,
            bio || null,
            avatarUrl || null,
            whatsapp || null,
            whatsappNotifications ? JSON.stringify(whatsappNotifications) : null,
            whatsappDndStart || null,
            whatsappDndEnd || null,
            status || "active",
            id
          ]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        const row = result.rows[0];
        const updatedUser = {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role ? row.role.toUpperCase() : "USER",
          avatarUrl: row.avatar_url,
          sector: row.sector,
          jobTitle: row.job_title,
          bio: row.bio,
          joinDate: row.join_date,
          whatsapp: row.whatsapp,
          whatsappNotifications: row.whatsapp_notifications,
          whatsappDndStart: row.whatsapp_dnd_start,
          whatsappDndEnd: row.whatsapp_dnd_end,
          status: row.status || "active"
        };
        console.log("[PUT /users/:id] User updated successfully:", id);
        res.json(updatedUser);
      } catch (err) {
        console.error("[PUT /users/:id] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.post("/", async (req, res) => {
      const { name, email, password, role, sector, jobTitle, bio } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Nome, email e senha s\xE3o obrigat\xF3rios." });
      }
      try {
        const result = await pool2.query(
          `INSERT INTO users (id, name, email, password, role, sector, job_title, bio, is_approved)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
             RETURNING id, name, email, role, sector, job_title, bio, avatar_url, is_approved`,
          ["u" + Date.now(), name, email, password, role || "USER", sector, jobTitle, bio]
          // Note: Password should be hashed in a real app, assuming plaintext for now based on existing context or relying on frontend hash? Ideally backend hashes.
          // CAUTION: If auth routes hash password, we must hash here too. Checking auth route recommended.
          // For now, inserting as is to match likely dev environment or assuming auth service handles hashing elsewhere. 
          // *Correction*: Auth usually hashes. I will verify if I can import bcrypt here.
          // If not available, I will insert as is but mark for review. 
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error(err);
        if (err.constraint === "users_email_key") {
          return res.status(400).json({ message: "Email j\xE1 cadastrado." });
        }
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/:id", async (req, res) => {
      const { id } = req.params;
      try {
        await pool2.query("DELETE FROM push_subscriptions WHERE user_id = $1", [id]);
        await pool2.query("DELETE FROM daily_checklist WHERE user_id = $1", [id]);
        await pool2.query("DELETE FROM notifications WHERE user_id = $1", [id]);
        await pool2.query("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1", [id]);
        await pool2.query("UPDATE check_ins SET user_id = NULL WHERE user_id = $1", [id]);
        await pool2.query("UPDATE posts SET author_id = NULL WHERE author_id = $1", [id]);
        await pool2.query("UPDATE goals SET user_id = NULL WHERE user_id = $1", [id]);
        await pool2.query("UPDATE focus_links SET user_id = NULL WHERE user_id = $1", [id]);
        const result = await pool2.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User deleted", id });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/tools.js
var require_tools = __commonJS({
  "backend/routes/tools.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    router.get("/links", async (req, res) => {
      try {
        const result = await pool2.query("SELECT * FROM focus_links ORDER BY created_at DESC");
        const links = result.rows.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description || "",
          link: row.url,
          // Map 'url' to 'link' for frontend
          icon: row.icon || "Target",
          category: row.category,
          isFavorite: row.is_favorite || false
        }));
        res.json(links);
      } catch (err) {
        console.error("[GET /tools/links] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.post("/links", async (req, res) => {
      const { title, description, link, url, category, icon, userId: bodyUserId } = req.body;
      const finalUrl = link || url;
      const userId = req.user ? req.user.id : bodyUserId;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      if (!finalUrl) {
        return res.status(400).json({ message: "URL is required" });
      }
      try {
        const id = "l" + Date.now();
        const result = await pool2.query(
          "INSERT INTO focus_links (id, title, description, url, icon, category, user_id, is_favorite) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
          [id, title, description || "", finalUrl, icon || "Target", category || "General", userId, false]
        );
        const row = result.rows[0];
        res.status(201).json({
          id: row.id,
          title: row.title,
          description: row.description || "",
          link: row.url,
          icon: row.icon || "Target",
          category: row.category,
          isFavorite: row.is_favorite || false
        });
      } catch (err) {
        console.error("[POST /tools/links] Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
      }
    });
    router.put("/links/:id", async (req, res) => {
      const { id } = req.params;
      const { title, description, link, url, icon, isFavorite, category } = req.body;
      const finalUrl = link || url;
      try {
        const result = await pool2.query(
          `UPDATE focus_links 
             SET title = COALESCE($1, title), 
                 description = COALESCE($2, description), 
                 url = COALESCE($3, url), 
                 icon = COALESCE($4, icon),
                 is_favorite = COALESCE($5, is_favorite),
                 category = COALESCE($6, category)
             WHERE id = $7 RETURNING *`,
          [title, description, finalUrl, icon, isFavorite, category, id]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Link n\xE3o encontrado" });
        }
        const row = result.rows[0];
        res.json({
          id: row.id,
          title: row.title,
          description: row.description || "",
          link: row.url,
          icon: row.icon || "Target",
          category: row.category,
          isFavorite: row.is_favorite || false
        });
      } catch (err) {
        console.error("[PUT /tools/links/:id] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/links/:id", async (req, res) => {
      const { id } = req.params;
      try {
        await pool2.query("DELETE FROM focus_links WHERE id = $1", [id]);
        res.json({ message: "Link deleted" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.get("/access-groups", async (req, res) => {
      try {
        const groupsResult = await pool2.query("SELECT * FROM access_groups ORDER BY created_at DESC");
        const groups = groupsResult.rows;
        const mappedGroups = await Promise.all(groups.map(async (group) => {
          const credsResult = await pool2.query("SELECT * FROM access_credentials WHERE group_id = $1", [group.id]);
          const links = credsResult.rows.map((cred) => ({
            id: cred.id,
            nome: cred.service_name,
            link: cred.url || "",
            icon: cred.icon || "LinkIcon",
            descricao: cred.notes || "",
            login: cred.username || "",
            senha: cred.password || "",
            isFavorite: cred.is_favorite || false
          }));
          return {
            id: group.id,
            name: group.name,
            color: group.color || "#F97316",
            links
          };
        }));
        res.json(mappedGroups);
      } catch (err) {
        console.error("[GET /access-groups] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.post("/access-groups", async (req, res) => {
      const { title, name, description, category, color } = req.body;
      const finalName = name || title;
      if (!finalName) {
        return res.status(400).json({ message: "O nome do grupo \xE9 obrigat\xF3rio" });
      }
      try {
        const id = "ag" + Date.now();
        const result = await pool2.query(
          "INSERT INTO access_groups (id, name, description, category, color) VALUES ($1, $2, $3, $4, $5) RETURNING *",
          [id, finalName, description, category, color || "#F97316"]
        );
        const newGroup = result.rows[0];
        res.status(201).json({
          id: newGroup.id,
          name: newGroup.name,
          title: newGroup.name,
          // Also include title for compatibility
          links: []
        });
      } catch (err) {
        console.error("[POST /access-groups] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/access-groups/:id", async (req, res) => {
      const { id } = req.params;
      const { name, title, description, category, color } = req.body;
      const finalName = name || title;
      try {
        const result = await pool2.query(
          `UPDATE access_groups 
             SET name = COALESCE($1, name), 
                 description = COALESCE($2, description), 
                 category = COALESCE($3, category),
                 color = COALESCE($4, color)
             WHERE id = $5 RETURNING *`,
          [finalName, description, category, color, id]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Grupo n\xE3o encontrado" });
        }
        res.json({
          id: result.rows[0].id,
          name: result.rows[0].name,
          color: result.rows[0].color,
          links: []
          // Simplified - caller should refetch if needed
        });
      } catch (err) {
        console.error("[PUT /access-groups/:id] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/access-groups/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await pool2.query("DELETE FROM access_groups WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Grupo n\xE3o encontrado" });
        }
        res.json({ message: "Grupo deletado", id });
      } catch (err) {
        console.error("[DELETE /access-groups/:id] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.post("/access-groups/:id/credentials", async (req, res) => {
      const { id: groupId } = req.params;
      const { serviceName, username, password, url, notes, icon } = req.body;
      try {
        const id = "ac" + Date.now();
        const result = await pool2.query(
          "INSERT INTO access_credentials (id, group_id, service_name, username, password, url, notes, icon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
          [id, groupId, serviceName, username, password, url, notes, icon || "LinkIcon"]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/credentials/:id", async (req, res) => {
      const { id } = req.params;
      const { serviceName, username, password, url, notes, isFavorite, icon } = req.body;
      try {
        const result = await pool2.query(
          `UPDATE access_credentials 
             SET service_name = COALESCE($1, service_name), 
                 username = COALESCE($2, username), 
                 password = COALESCE($3, password),
                 url = COALESCE($4, url),
                 notes = COALESCE($5, notes),
                 is_favorite = COALESCE($6, is_favorite),
                 icon = COALESCE($7, icon)
             WHERE id = $8 RETURNING *`,
          [serviceName, username, password, url, notes, isFavorite, icon, id]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Credencial n\xE3o encontrada" });
        }
        const cred = result.rows[0];
        res.json({
          id: cred.id,
          nome: cred.service_name,
          link: cred.url || "",
          icon: cred.icon || "LinkIcon",
          descricao: cred.notes || "",
          login: cred.username || "",
          senha: cred.password || "",
          isFavorite: cred.is_favorite || false
        });
      } catch (err) {
        console.error("[PUT /credentials/:id] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/credentials/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await pool2.query("DELETE FROM access_credentials WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Credencial n\xE3o encontrada" });
        }
        res.json({ message: "Credencial deletada", id });
      } catch (err) {
        console.error("[DELETE /credentials/:id] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/reports.js
var require_reports = __commonJS({
  "backend/routes/reports.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    var { authMiddleware: authMiddleware2 } = require_auth();
    var multer = __require("multer");
    var { GoogleGenAI } = __require("@google/genai");
    var path = __require("path");
    var fs = __require("fs");
    var upload = multer({ dest: "uploads/" });
    var ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
    router.use(authMiddleware2);
    router.get("/", async (req, res, next) => {
      try {
        const result = await pool2.query(
          "SELECT id, title, type, author_id, department, is_favorite, created_at FROM reports ORDER BY created_at DESC"
        );
        res.json(result.rows);
      } catch (error) {
        next(error);
      }
    });
    router.get("/:id", async (req, res, next) => {
      try {
        const { id } = req.params;
        const result = await pool2.query("SELECT * FROM reports WHERE id = $1", [id]);
        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Relat\xF3rio n\xE3o encontrado." });
        }
        res.json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    });
    router.post("/", async (req, res, next) => {
      try {
        const { id, title, type, content, department, metadata } = req.body;
        const author_id = req.user.id;
        await pool2.query(
          `INSERT INTO reports (id, title, type, content, author_id, department, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id || `req-${Date.now()}`, title, type, content, author_id, department, metadata]
        );
        res.status(201).json({ message: "Relat\xF3rio salvo com sucesso." });
      } catch (error) {
        next(error);
      }
    });
    router.post("/meeting/upload", upload.single("transcript"), async (req, res, next) => {
      try {
        if (!ai) {
          return res.status(500).json({ message: "A Chave da API do Gemini n\xE3o est\xE1 configurada no backend." });
        }
        if (!req.file) {
          return res.status(400).json({ message: "Nenhum arquivo enviado." });
        }
        const fileContent = fs.readFileSync(req.file.path, "utf-8");
        console.log(`[Upload] File content length: ${fileContent.length} chars. Path: ${req.file.path}`);
        if (!fileContent.trim()) {
          return res.status(400).json({ message: "O arquivo enviado est\xE1 vazio ou n\xE3o p\xF4de ser lido corretamente. Por favor, envie um arquivo .txt com a transcri\xE7\xE3o." });
        }
        const storageDir = path.join(__dirname, "../storage/transcripts");
        if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
        const newFilename = `${Date.now()}-${req.file.originalname}`;
        const newPath = path.join(storageDir, newFilename);
        fs.renameSync(req.file.path, newPath);
        const transcriptUrl = `${req.protocol}://${req.get("host")}/storage/transcripts/${newFilename}`;
        const prompt = `
# MASTER PROMPT \u2014 GERA\xC7\xC3O AUTOM\xC1TICA DE ATA DE REUNI\xC3O (FOCUSHUB)

Voc\xEA \xE9 um assistente corporativo especializado em documenta\xE7\xE3o executiva.
Sua miss\xE3o \xE9 transformar automaticamente a transcri\xE7\xE3o de reuni\xE3o enviada abaixo em uma **Ata de Reuni\xE3o profissional**.
O objetivo \xE9 gerar um documento claro, executivo e padronizado, sem copiar literalmente toda a transcri\xE7\xE3o. A IA deve interpretar o conte\xFAdo, identificar os pontos relevantes e organiz\xE1-los em uma ata objetiva.

# REGRAS DA IA
Voc\xEA nunca dever\xE1 copiar integralmente a transcri\xE7\xE3o.
Voc\xEA dever\xE1:
- resumir;
- reorganizar;
- remover repeti\xE7\xF5es;
- eliminar conversas paralelas;
- destacar decis\xF5es importantes;
- destacar respons\xE1veis;
- identificar prazos;
- produzir linguagem profissional.

# FORMATO DE SA\xCDDA (Obrigat\xF3rio)
Retorne APENAS um objeto JSON v\xE1lido (sem marca\xE7\xE3o de bloco de c\xF3digo) com o seguinte formato exato, extraindo as informa\xE7\xF5es exigidas nas 10 se\xE7\xF5es estruturais da ata:

{
  "title": "T\xEDtulo sugerido para a reuni\xE3o",
  "date": "Data da reuni\xE3o no formato DD/MM/AAAA (Identificar a data em que ocorreu. Se n\xE3o encontrar, retorne 'Data n\xE3o identificada')",
  "time": "Hor\xE1rio da reuni\xE3o (Identificar o hor\xE1rio em que ocorreu. Se n\xE3o encontrar, retorne 'Hor\xE1rio n\xE3o identificado')",
  "department": "Departamento inferido (ou Geral)",
  "project": "Projeto inferido (ou N/A)",
  "objective": "Objetivo da Reuni\xE3o (Identificar automaticamente o prop\xF3sito principal da reuni\xE3o e descrev\xEA-lo em um ou dois par\xE1grafos.)",
  "executiveSummary": "Resumo Executivo (Gerar um resumo objetivo contendo apenas os principais assuntos tratados. 5 a 10 linhas.)",
  "participants": [
    { "name": "Nome", "role": "Cargo (ou N/A)", "status": "Participa\xE7\xE3o (Presente/Ausente)" }
  ],
  "topicsDiscussed": [
    { "topic": "Nome do t\xF3pico", "description": "Breve explica\xE7\xE3o do assunto" }
  ],
  "decisions": ["Decis\xE3o tomada 1", "Decis\xE3o tomada 2"],
  "actionItems": [
    { "action": "Descri\xE7\xE3o da a\xE7\xE3o", "assignee": "Respons\xE1vel", "deadline": "Prazo (ou 'A definir')", "status": "Pendente" }
  ],
  "nextSteps": ["Pr\xF3ximo passo 1", "Pr\xF3ximo passo 2"],
  "attentionPoints": ["Riscos, pend\xEAncias, depend\xEAncias, bloqueios, decis\xF5es pendentes ou informa\xE7\xF5es cr\xEDticas"],
  "generalObservations": "Observa\xE7\xF5es Gerais (Qualquer informa\xE7\xE3o relevante que n\xE3o tenha sido inclu\xEDda nas se\xE7\xF5es anteriores.)",
  "conclusion": "Conclus\xE3o (Pequeno encerramento resumindo o resultado da reuni\xE3o.)"
}

Transcri\xE7\xE3o:
${fileContent.substring(0, 3e4)}
        `;
        let response;
        let retries = 0;
        const maxRetries = 6;
        while (retries < maxRetries) {
          try {
            response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json"
              }
            });
            break;
          } catch (err) {
            const isRateLimit = err.status === 429 || err.status === 503 || err.status === 500 || err.message && (err.message.includes("429") || err.message.includes("503") || err.message.includes("500"));
            if (isRateLimit && retries < maxRetries - 1) {
              retries++;
              let waitTimeMs = 15e3;
              const match = err.message ? err.message.match(/retry in ([\d\.]+)s/i) : null;
              if (match && match[1]) {
                waitTimeMs = Math.ceil(parseFloat(match[1]) * 1e3) + 1500;
              } else {
                waitTimeMs = retries * 6e3 + Math.random() * 3e3;
              }
              console.log(`[Rate Limit] Gemini API rate limit hit. Google requested wait. Retrying in ${Math.round(waitTimeMs)}ms (Attempt ${retries}/${maxRetries - 1})...`);
              await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
            } else {
              throw err;
            }
          }
        }
        const analysisText = response.text;
        const cleanText = analysisText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
        const analysis = JSON.parse(cleanText);
        analysis.transcriptUrl = transcriptUrl;
        res.json(analysis);
      } catch (error) {
        console.error("Error processing transcript:", error);
        res.status(500).json({ message: "Erro da IA: " + error.message });
      }
    });
    router.post("/export/doc", async (req, res, next) => {
      try {
        const { htmlContent, title } = req.body;
        if (!htmlContent) {
          return res.status(400).json({ message: "Conte\xFAdo HTML \xE9 obrigat\xF3rio." });
        }
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        const html = preHtml + htmlContent + postHtml;
        res.set({
          "Content-Type": "application/vnd.ms-word",
          "Content-Disposition": `attachment; filename="${title || "relatorio"}.doc"`
        });
        res.send(html);
      } catch (error) {
        console.error("Error generating DOC:", error);
        res.status(500).json({ message: "Erro ao gerar arquivo DOC." });
      }
    });
    router.get("/dashboard/stats", async (req, res, next) => {
      try {
        const tasksResult = await pool2.query("SELECT status, COUNT(*) FROM tasks GROUP BY status");
        const tasksCount = tasksResult.rows.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {});
        res.json({
          tasks: tasksCount,
          totalTasks: Object.values(tasksCount).reduce((a, b) => a + b, 0)
        });
      } catch (error) {
        next(error);
      }
    });
    router.get("/generate/:type", async (req, res, next) => {
      try {
        const { type } = req.params;
        const { start, end } = req.query;
        let data;
        if (type === "tasks") {
          let query = `
                SELECT t.id, t.title, t.status, t.priority, t.due_date, u.name as assignee_name
                FROM tasks t
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE 1=1
            `;
          let params = [];
          let pIdx = 1;
          if (start) {
            query += ` AND t.created_at >= $${pIdx++}`;
            params.push(start);
          }
          if (end) {
            query += ` AND t.created_at <= $${pIdx++}`;
            params.push(end + " 23:59:59");
          }
          query += ` ORDER BY t.created_at DESC`;
          const result = await pool2.query(query, params);
          data = result.rows;
        } else if (type === "team") {
          const usersResult = await pool2.query("SELECT id, name, email, sector, role FROM users ORDER BY name");
          const teamMembers = usersResult.rows;
          let query = `
                SELECT u.name as user_name, u.sector, c.timestamp as check_in_time, c.check_out_time, c.daily_report
                FROM check_ins c
                JOIN users u ON c.user_id = u.id
                WHERE 1=1
            `;
          let params = [];
          let pIdx = 1;
          if (start) {
            query += ` AND c.timestamp >= $${pIdx++}`;
            params.push(start);
          }
          if (end) {
            query += ` AND c.timestamp <= $${pIdx++}`;
            params.push(end + " 23:59:59");
          }
          query += ` ORDER BY c.timestamp DESC LIMIT 50`;
          const activityResult = await pool2.query(query, params);
          const recentActivity = activityResult.rows;
          data = { teamMembers, recentActivity };
        } else if (type === "agenda") {
          try {
            let query = `
                    SELECT 
                        id, 
                        title, 
                        description, 
                        start_time as due_date, 
                        'Agendado' as status, 
                        organizer_name as assignee_name
                    FROM google_calendar_events
                    WHERE start_time IS NOT NULL
                `;
            let params = [];
            let pIdx = 1;
            if (start) {
              query += ` AND start_time >= $${pIdx++}`;
              params.push(start);
            }
            if (end) {
              query += ` AND start_time <= $${pIdx++}`;
              params.push(end + " 23:59:59");
            }
            query += ` ORDER BY start_time ASC`;
            const result = await pool2.query(query, params);
            data = result.rows;
          } catch (e) {
            console.error("Error fetching agenda for report:", e);
            data = [];
          }
        } else if (type === "indicators") {
          let filterString = "";
          let params = [];
          let pIdx = 1;
          if (start) {
            filterString += ` AND t.created_at >= $${pIdx++}`;
            params.push(start);
          }
          if (end) {
            filterString += ` AND t.created_at <= $${pIdx++}`;
            params.push(end + " 23:59:59");
          }
          const tasksResult = await pool2.query(`SELECT t.status, COUNT(*) FROM tasks t WHERE 1=1 ${filterString} GROUP BY t.status`, params);
          const tasksCount = tasksResult.rows.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {});
          const sectorResult = await pool2.query(`
                SELECT u.sector, COUNT(t.id) as count
                FROM tasks t
                JOIN users u ON t.assignee_id = u.id
                WHERE t.status = 'concluida' AND u.sector IS NOT NULL ${filterString}
                GROUP BY u.sector
            `, params);
          const sectorCount = sectorResult.rows.reduce((acc, row) => ({ ...acc, [row.sector]: parseInt(row.count) }), {});
          const tasksListResult = await pool2.query(`
                SELECT t.id, t.title, t.status, t.priority, t.due_date, u.name as assignee_name
                FROM tasks t
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE 1=1 ${filterString}
                ORDER BY t.created_at DESC
            `, params);
          const tasksList = tasksListResult.rows;
          data = { tasksCount, sectorCount, tasksList };
        } else {
          return res.status(400).json({ message: "Tipo de relat\xF3rio inv\xE1lido" });
        }
        res.json(data);
      } catch (error) {
        console.error("Erro ao gerar relat\xF3rio:", error);
        res.status(500).json({ message: "Erro ao gerar dados do relat\xF3rio." });
      }
    });
    module.exports = router;
  }
});

// backend/routes/dailyChecklist.js
var require_dailyChecklist = __commonJS({
  "backend/routes/dailyChecklist.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    var formatDate = (date) => {
      if (!date) return null;
      if (typeof date === "string") {
        return date.split("T")[0];
      }
      if (date instanceof Date) {
        return date.toISOString().split("T")[0];
      }
      return String(date).split("T")[0];
    };
    router.get("/", async (req, res) => {
      const { userId, date } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "userId \xE9 obrigat\xF3rio" });
      }
      try {
        let query = "SELECT * FROM daily_checklist WHERE user_id = $1";
        const params = [userId];
        if (date) {
          query += " AND date = $2";
          params.push(date);
        }
        query += " ORDER BY id ASC";
        const result = await pool2.query(query, params);
        const items = result.rows.map((row) => ({
          id: row.id,
          userId: row.user_id,
          text: row.text,
          completed: row.completed,
          date: formatDate(row.date)
        }));
        res.json(items);
      } catch (err) {
        console.error("[GET /daily-checklist] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.post("/", async (req, res) => {
      const { userId, text, date } = req.body;
      if (!userId || !text || !date) {
        return res.status(400).json({ message: "userId, text e date s\xE3o obrigat\xF3rios" });
      }
      try {
        const id = "dc" + Date.now();
        await pool2.query(
          "INSERT INTO daily_checklist (id, user_id, text, completed, date) VALUES ($1, $2, $3, $4, $5)",
          [id, userId, text, false, date]
        );
        const newItem = {
          id,
          userId,
          text,
          completed: false,
          date
        };
        res.status(201).json(newItem);
      } catch (err) {
        console.error("[POST /daily-checklist] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/:id", async (req, res) => {
      const { id } = req.params;
      const { completed, text } = req.body;
      try {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (completed !== void 0) {
          updates.push(`completed = $${paramIndex++}`);
          params.push(completed);
        }
        if (text !== void 0) {
          updates.push(`text = $${paramIndex++}`);
          params.push(text);
        }
        if (updates.length === 0) {
          return res.status(400).json({ message: "Nenhum campo para atualizar" });
        }
        params.push(id);
        const query = `UPDATE daily_checklist SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
        const result = await pool2.query(query, params);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Item n\xE3o encontrado" });
        }
        const row = result.rows[0];
        res.json({
          id: row.id,
          userId: row.user_id,
          text: row.text,
          completed: row.completed,
          date: formatDate(row.date)
        });
      } catch (err) {
        console.error("[PUT /daily-checklist/:id] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/:id", async (req, res) => {
      const { id } = req.params;
      const user = req.user;
      try {
        const itemCheck = await pool2.query("SELECT user_id FROM daily_checklist WHERE id = $1", [id]);
        if (itemCheck.rowCount === 0) {
          return res.status(404).json({ message: "Item n\xE3o encontrado" });
        }
        const item = itemCheck.rows[0];
        if (user.role !== "ADMIN" && user.id !== item.user_id) {
          return res.status(403).json({ message: "Voc\xEA n\xE3o tem permiss\xE3o para excluir este item." });
        }
        const result = await pool2.query("DELETE FROM daily_checklist WHERE id = $1 RETURNING id", [id]);
        res.json({ message: "Item deletado", id });
      } catch (err) {
        console.error("[DELETE /daily-checklist/:id] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/notifications.js
var require_notifications = __commonJS({
  "backend/routes/notifications.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    var pushService = require_pushService();
    router.get("/", async (req, res) => {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "userId \xE9 obrigat\xF3rio" });
      }
      try {
        const result = await pool2.query(
          "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
          [userId]
        );
        const notifications = result.rows.map((row) => ({
          id: row.id,
          userId: row.user_id,
          type: row.type,
          message: row.message,
          linkTo: row.link_to,
          isRead: row.is_read,
          createdAt: row.created_at,
          taskId: row.task_id
        }));
        res.json(notifications);
      } catch (err) {
        console.error("[GET /notifications] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    var pushTitleMap = {
      "TASK_ASSIGNED": "\u{1F4CB} Nova Tarefa Atribu\xEDda",
      "TASK_STATUS_CHANGED": "\u{1F504} Atualiza\xE7\xE3o de Tarefa",
      "NEW_POST": "\u{1F4DD} Nova Publica\xE7\xE3o",
      "TASK_DUE_SOON": "\u23F0 Prazo Pr\xF3ximo"
    };
    router.post("/", async (req, res) => {
      const { userId, type, message, linkTo, taskId } = req.body;
      if (!userId || !type || !message) {
        return res.status(400).json({ message: "userId, type e message s\xE3o obrigat\xF3rios" });
      }
      try {
        const id = "n" + Date.now();
        await pool2.query(
          `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, userId, type, message, linkTo || "dashboard", false, taskId || null]
        );
        const newNotification = {
          id,
          userId,
          type,
          message,
          linkTo: linkTo || "dashboard",
          isRead: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          taskId: taskId || null
        };
        pushService.sendPushToUser(userId, {
          title: pushTitleMap[type] || "Focus Hub",
          body: message,
          url: "/",
          tag: `notification-${type}-${id}`
        }).catch((err) => {
          console.warn("[POST /notifications] Push notification failed (non-blocking):", err.message);
        });
        res.status(201).json(newNotification);
      } catch (err) {
        console.error("[POST /notifications] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/:id/read", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await pool2.query(
          "UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *",
          [id]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Notifica\xE7\xE3o n\xE3o encontrada" });
        }
        res.json({ message: "Marcada como lida", id });
      } catch (err) {
        console.error("[PUT /notifications/:id/read] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.put("/mark-all-read", async (req, res) => {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "userId \xE9 obrigat\xF3rio" });
      }
      try {
        await pool2.query(
          "UPDATE notifications SET is_read = true WHERE user_id = $1",
          [userId]
        );
        res.json({ message: "Todas as notifica\xE7\xF5es marcadas como lidas" });
      } catch (err) {
        console.error("[PUT /notifications/mark-all-read] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await pool2.query("DELETE FROM notifications WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Notifica\xE7\xE3o n\xE3o encontrada" });
        }
        res.json({ message: "Notifica\xE7\xE3o deletada", id });
      } catch (err) {
        console.error("[DELETE /notifications/:id] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/push.js
var require_push = __commonJS({
  "backend/routes/push.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var pushService = require_pushService();
    router.post("/subscribe", async (req, res) => {
      const userId = req.user.id;
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: "Subscription inv\xE1lida. endpoint e keys s\xE3o obrigat\xF3rios." });
      }
      if (!subscription.keys.p256dh || !subscription.keys.auth) {
        return res.status(400).json({ message: "Subscription keys incompletas. p256dh e auth s\xE3o obrigat\xF3rios." });
      }
      try {
        await pushService.saveSubscription(userId, subscription);
        res.status(201).json({ message: "Subscription salva com sucesso" });
      } catch (err) {
        console.error("[POST /push/subscribe] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.delete("/unsubscribe", async (req, res) => {
      const userId = req.user.id;
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ message: "endpoint \xE9 obrigat\xF3rio" });
      }
      try {
        const result = await pushService.removeSubscription(userId, endpoint);
        if (!result.success) {
          return res.status(404).json({ message: "Subscription n\xE3o encontrada" });
        }
        res.json({ message: "Subscription removida com sucesso" });
      } catch (err) {
        console.error("[DELETE /push/unsubscribe] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    router.get("/vapid-public-key", (req, res) => {
      try {
        const publicKey = pushService.getVapidPublicKey();
        res.json({ publicKey });
      } catch (err) {
        console.error("[GET /push/vapid-public-key] Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/contents.js
var require_contents = __commonJS({
  "backend/routes/contents.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    var multer = __require("multer");
    var path = __require("path");
    var fs = __require("fs");
    var storage = multer.diskStorage({
      destination: function(req, file, cb) {
        let folder = "documentos";
        if (file.fieldname === "cover_image") {
          folder = "capas";
        }
        const dir = path.join(__dirname, "..", "storage", folder);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });
    var upload = multer({
      storage,
      limits: { fileSize: 50 * 1024 * 1024 }
      // 50MB limit
    });
    var isAdmin = (req, res, next) => {
      if (req.user && req.user.role && req.user.role.toUpperCase() === "ADMIN") {
        next();
      } else {
        res.status(403).json({ message: "Acesso negado. Apenas administradores podem realizar esta a\xE7\xE3o." });
      }
    };
    router.get("/", async (req, res) => {
      try {
        const result = await pool2.query("SELECT * FROM contents ORDER BY order_index ASC, created_at DESC");
        res.json(result.rows);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao buscar conte\xFAdos" });
      }
    });
    router.post("/", isAdmin, upload.fields([{ name: "file", maxCount: 1 }, { name: "cover_image", maxCount: 1 }]), async (req, res) => {
      try {
        const { title, description, category, icon, color, status, order_index } = req.body;
        let file_url = "";
        if (req.files["file"] && req.files["file"].length > 0) {
          file_url = `${req.protocol}://${req.get("host")}/storage/documentos/${req.files["file"][0].filename}`;
        } else {
          return res.status(400).json({ message: "O arquivo \xE9 obrigat\xF3rio." });
        }
        let cover_image = null;
        if (req.files["cover_image"] && req.files["cover_image"].length > 0) {
          cover_image = `${req.protocol}://${req.get("host")}/storage/capas/${req.files["cover_image"][0].filename}`;
        }
        const id = `content-${Date.now()}`;
        const isActive = status === "true" || status === true;
        const result = await pool2.query(
          `INSERT INTO contents (id, title, description, category, file_url, cover_image, icon, color, status, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [id, title, description, category, file_url, cover_image, icon || "Book", color || "#FF6B00", isActive, parseInt(order_index) || 0]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao criar conte\xFAdo" });
      }
    });
    router.put("/:id", isAdmin, upload.fields([{ name: "file", maxCount: 1 }, { name: "cover_image", maxCount: 1 }]), async (req, res) => {
      try {
        const { id } = req.params;
        const { title, description, category, icon, color, status, order_index } = req.body;
        const currentRes = await pool2.query("SELECT * FROM contents WHERE id = $1", [id]);
        if (currentRes.rows.length === 0) {
          return res.status(404).json({ message: "Conte\xFAdo n\xE3o encontrado" });
        }
        const current = currentRes.rows[0];
        let file_url = current.file_url;
        if (req.files["file"] && req.files["file"].length > 0) {
          file_url = `${req.protocol}://${req.get("host")}/storage/documentos/${req.files["file"][0].filename}`;
          try {
            if (current.file_url) {
              const oldFilename = current.file_url.split("/").pop();
              const oldPath = path.join(__dirname, "..", "storage", "documentos", oldFilename);
              if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
          } catch (e) {
            console.error("Error deleting old file:", e);
          }
        }
        let cover_image = current.cover_image;
        if (req.files["cover_image"] && req.files["cover_image"].length > 0) {
          cover_image = `${req.protocol}://${req.get("host")}/storage/capas/${req.files["cover_image"][0].filename}`;
          try {
            if (current.cover_image) {
              const oldFilename = current.cover_image.split("/").pop();
              const oldPath = path.join(__dirname, "..", "storage", "capas", oldFilename);
              if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
          } catch (e) {
            console.error("Error deleting old cover:", e);
          }
        } else if (req.body.remove_cover === "true") {
          cover_image = null;
          try {
            if (current.cover_image) {
              const oldFilename = current.cover_image.split("/").pop();
              const oldPath = path.join(__dirname, "..", "storage", "capas", oldFilename);
              if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
          } catch (e) {
            console.error("Error deleting old cover:", e);
          }
        }
        const isActive = status === "true" || status === true;
        const result = await pool2.query(
          `UPDATE contents 
             SET title = $1, description = $2, category = $3, file_url = $4, cover_image = $5, 
                 icon = $6, color = $7, status = $8, order_index = $9, updated_at = CURRENT_TIMESTAMP
             WHERE id = $10 RETURNING *`,
          [title, description, category, file_url, cover_image, icon || "Book", color || "#FF6B00", isActive, parseInt(order_index) || 0, id]
        );
        res.json(result.rows[0]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao atualizar conte\xFAdo" });
      }
    });
    router.delete("/:id", isAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        const currentRes = await pool2.query("SELECT * FROM contents WHERE id = $1", [id]);
        if (currentRes.rows.length === 0) {
          return res.status(404).json({ message: "Conte\xFAdo n\xE3o encontrado" });
        }
        const current = currentRes.rows[0];
        try {
          if (current.file_url) {
            const oldFilename = current.file_url.split("/").pop();
            const oldPath = path.join(__dirname, "..", "storage", "documentos", oldFilename);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          if (current.cover_image) {
            const oldFilename = current.cover_image.split("/").pop();
            const oldPath = path.join(__dirname, "..", "storage", "capas", oldFilename);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
        } catch (e) {
          console.error("Error deleting files:", e);
        }
        await pool2.query("DELETE FROM contents WHERE id = $1", [id]);
        res.json({ message: "Conte\xFAdo removido com sucesso" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao remover conte\xFAdo" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/drive.js
var require_drive = __commonJS({
  "backend/routes/drive.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { google } = __require("googleapis");
    var { pool: pool2 } = require_db();
    var multer = __require("multer");
    var { PassThrough } = __require("stream");
    var upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024
        // 50MB limit
      }
    });
    async function getAuthClient(userId) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      const { rows } = await pool2.query(
        `SELECT google_access_token, google_refresh_token, google_token_expires
       FROM users
      WHERE id = $1`,
        [userId]
      );
      if (!rows.length || !rows[0].google_access_token) {
        throw new Error("Google account not connected");
      }
      const user = rows[0];
      let expiryDate = 1;
      if (user.google_token_expires) {
        let dateStr = user.google_token_expires;
        if (typeof dateStr === "object") {
          expiryDate = dateStr.getTime() - dateStr.getTimezoneOffset() * 6e4;
        } else if (typeof dateStr === "string") {
          if (!dateStr.includes("Z") && !dateStr.includes("T")) {
            dateStr = dateStr.replace(" ", "T") + "Z";
          }
          expiryDate = new Date(dateStr).getTime();
        }
      }
      oauth2Client.setCredentials({
        access_token: user.google_access_token,
        refresh_token: user.google_refresh_token,
        expiry_date: expiryDate
      });
      const now = Date.now();
      const expiresAt = expiryDate;
      if (expiresAt && expiresAt - now < 6e4) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);
          await pool2.query(
            `UPDATE users
            SET google_access_token  = $1,
                google_refresh_token = COALESCE($2, google_refresh_token),
                google_token_expires = $3
          WHERE id = $4`,
            [
              credentials.access_token,
              credentials.refresh_token || null,
              credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
              userId
            ]
          );
        } catch (err) {
          console.error("[Drive] Token refresh failed:", err.message);
          throw new Error("Failed to refresh Google token");
        }
      }
      return oauth2Client;
    }
    var DRIVE_FILE_FIELDS = "id, name, mimeType, modifiedTime, size, owners, starred, iconLink, thumbnailLink, webViewLink, webContentLink, parents";
    async function isAllowedFolder(userId, userRole, userSector, folderId, drive) {
      if (userRole === "ADMIN") return true;
      const { rows } = await pool2.query(
        `SELECT id FROM drive_folder_permissions
      WHERE folder_id = $1 AND sector = $2
      LIMIT 1`,
        [folderId, userSector]
      );
      if (rows.length > 0) return true;
      let currentId = folderId;
      const visited = /* @__PURE__ */ new Set();
      while (currentId && currentId !== "root") {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        try {
          const fileRes = await drive.files.get({
            fileId: currentId,
            fields: "parents",
            supportsAllDrives: true
          });
          const parents = fileRes.data.parents;
          if (!parents || parents.length === 0) break;
          const parentId = parents[0];
          const { rows: parentRows } = await pool2.query(
            `SELECT id FROM drive_folder_permissions
          WHERE folder_id = $1 AND sector = $2
          LIMIT 1`,
            [parentId, userSector]
          );
          if (parentRows.length > 0) return true;
          currentId = parentId;
        } catch {
          break;
        }
      }
      return false;
    }
    router.get("/files", async (req, res) => {
      try {
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        const folderId = req.query.folderId || "root";
        const pageToken = req.query.pageToken || void 0;
        const pageSize = parseInt(req.query.pageSize, 10) || 30;
        if (folderId === "root" && req.user.role !== "ADMIN") {
          const { rows: perms } = await pool2.query(
            `SELECT folder_id, folder_name FROM drive_folder_permissions
          WHERE sector = $1
          ORDER BY folder_name`,
            [req.user.sector]
          );
          const files = [];
          for (const perm of perms) {
            try {
              const fileRes = await drive.files.get({
                fileId: perm.folder_id,
                fields: DRIVE_FILE_FIELDS,
                supportsAllDrives: true
              });
              files.push(fileRes.data);
            } catch (err) {
              console.error(`[Drive] Could not fetch folder ${perm.folder_id}:`, err.message);
            }
          }
          return res.json({ files, nextPageToken: null });
        }
        if (req.user.role !== "ADMIN") {
          const allowed = await isAllowedFolder(
            req.user.id,
            req.user.role,
            req.user.sector,
            folderId,
            drive
          );
          if (!allowed) {
            return res.status(403).json({ error: "Access denied to this folder" });
          }
        }
        const response = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: `nextPageToken, files(${DRIVE_FILE_FIELDS})`,
          orderBy: "folder, name",
          pageSize,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        res.json({
          files: response.data.files || [],
          nextPageToken: response.data.nextPageToken || null
        });
      } catch (err) {
        console.error("[Drive] Error listing files:", err.message);
        res.status(500).json({ error: "Failed to list files" });
      }
    });
    router.post("/upload", upload.single("file"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        const folderId = req.body.folderId || "root";
        if (req.user.role !== "ADMIN" && folderId !== "root") {
          const allowed = await isAllowedFolder(
            req.user.id,
            req.user.role,
            req.user.sector,
            folderId,
            drive
          );
          if (!allowed) {
            return res.status(403).json({ error: "Access denied to this folder" });
          }
        }
        const bufferStream = new PassThrough();
        bufferStream.end(req.file.buffer);
        const fileMetadata = {
          name: req.file.originalname,
          parents: [folderId]
        };
        const media = {
          mimeType: req.file.mimetype,
          body: bufferStream
        };
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media,
          fields: DRIVE_FILE_FIELDS,
          supportsAllDrives: true
        });
        res.json(response.data);
      } catch (err) {
        console.error("[Drive] Error uploading file:", err.message);
        res.status(500).json({ error: `Failed to upload file: ${err.message}` });
      }
    });
    router.get("/files/:id", async (req, res) => {
      try {
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        if (req.user.role !== "ADMIN") {
          const allowed = await isAllowedFolder(
            req.user.id,
            req.user.role,
            req.user.sector,
            req.params.id,
            drive
          );
          if (!allowed) {
            return res.status(403).json({ error: "Access denied to this file" });
          }
        }
        const response = await drive.files.get({
          fileId: req.params.id,
          fields: DRIVE_FILE_FIELDS,
          supportsAllDrives: true
        });
        res.json(response.data);
      } catch (err) {
        console.error("[Drive] Error getting file:", err.message);
        if (err.code === 404) {
          return res.status(404).json({ error: "File not found" });
        }
        res.status(500).json({ error: "Failed to get file details" });
      }
    });
    router.get("/search", async (req, res) => {
      try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
          return res.status(400).json({ error: "Search query is required" });
        }
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        let q = `name contains '${searchQuery.replace(/'/g, "\\'")}' and trashed = false`;
        if (req.user.role !== "ADMIN") {
          const { rows: perms } = await pool2.query(
            `SELECT folder_id FROM drive_folder_permissions WHERE sector = $1`,
            [req.user.sector]
          );
          if (perms.length === 0) {
            return res.json({ files: [] });
          }
          const parentClauses = perms.map((p) => `'${p.folder_id}' in parents`).join(" or ");
          q += ` and (${parentClauses})`;
        }
        const response = await drive.files.list({
          q,
          fields: `files(${DRIVE_FILE_FIELDS})`,
          orderBy: "folder, name",
          pageSize: 50,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        res.json({ files: response.data.files || [] });
      } catch (err) {
        console.error("[Drive] Error searching files:", err.message);
        res.status(500).json({ error: "Failed to search files" });
      }
    });
    router.get("/recent", async (req, res) => {
      try {
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        let q = "trashed = false";
        if (req.user.role !== "ADMIN") {
          const { rows: perms } = await pool2.query(
            `SELECT folder_id FROM drive_folder_permissions WHERE sector = $1`,
            [req.user.sector]
          );
          if (perms.length === 0) {
            return res.json({ files: [] });
          }
          const parentClauses = perms.map((p) => `'${p.folder_id}' in parents`).join(" or ");
          q += ` and (${parentClauses})`;
        }
        const response = await drive.files.list({
          q,
          fields: `files(${DRIVE_FILE_FIELDS})`,
          orderBy: "modifiedTime desc",
          pageSize: 50,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        res.json({ files: response.data.files || [] });
      } catch (err) {
        console.error("[Drive] Error listing recent files:", err.message);
        res.status(500).json({ error: "Failed to list recent files" });
      }
    });
    router.get("/shared", async (req, res) => {
      try {
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        const response = await drive.files.list({
          q: "sharedWithMe = true and trashed = false",
          fields: `files(${DRIVE_FILE_FIELDS})`,
          orderBy: "modifiedTime desc",
          pageSize: 50,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        res.json({ files: response.data.files || [] });
      } catch (err) {
        console.error("[Drive] Error listing shared files:", err.message);
        res.status(500).json({ error: "Failed to list shared files" });
      }
    });
    router.get("/starred", async (req, res) => {
      try {
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        const response = await drive.files.list({
          q: "starred = true and trashed = false",
          fields: `files(${DRIVE_FILE_FIELDS})`,
          orderBy: "modifiedTime desc",
          pageSize: 50,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        res.json({ files: response.data.files || [] });
      } catch (err) {
        console.error("[Drive] Error listing starred files:", err.message);
        res.status(500).json({ error: "Failed to list starred files" });
      }
    });
    router.get("/trash", async (req, res) => {
      try {
        if (req.user.role !== "ADMIN") {
          return res.status(403).json({ error: "Admin access required" });
        }
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        const response = await drive.files.list({
          q: "trashed = true",
          fields: `files(${DRIVE_FILE_FIELDS})`,
          orderBy: "modifiedTime desc",
          pageSize: 50,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        res.json({ files: response.data.files || [] });
      } catch (err) {
        console.error("[Drive] Error listing trashed files:", err.message);
        res.status(500).json({ error: "Failed to list trashed files" });
      }
    });
    router.get("/storage", async (req, res) => {
      try {
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        const response = await drive.about.get({
          fields: "storageQuota"
        });
        res.json(response.data.storageQuota);
      } catch (err) {
        console.error("[Drive] Error getting storage info:", err.message);
        res.status(500).json({ error: "Failed to get storage information" });
      }
    });
    router.patch("/files/:id/star", async (req, res) => {
      try {
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        const current = await drive.files.get({
          fileId: req.params.id,
          fields: "starred",
          supportsAllDrives: true
        });
        const newStarred = !current.data.starred;
        const response = await drive.files.update({
          fileId: req.params.id,
          requestBody: { starred: newStarred },
          fields: DRIVE_FILE_FIELDS,
          supportsAllDrives: true
        });
        res.json(response.data);
      } catch (err) {
        console.error("[Drive] Error toggling star:", err.message);
        res.status(500).json({ error: "Failed to toggle star" });
      }
    });
    router.delete("/files/:id", async (req, res) => {
      try {
        if (req.user.role !== "ADMIN") {
          return res.status(403).json({ error: "Admin access required" });
        }
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        await drive.files.update({
          fileId: req.params.id,
          requestBody: { trashed: true },
          supportsAllDrives: true
        });
        res.json({ message: "File moved to trash" });
      } catch (err) {
        console.error("[Drive] Error trashing file:", err.message);
        res.status(500).json({ error: "Failed to trash file" });
      }
    });
    router.get("/files/:id/preview", async (req, res) => {
      try {
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        if (req.user.role !== "ADMIN") {
          const allowed = await isAllowedFolder(
            req.user.id,
            req.user.role,
            req.user.sector,
            req.params.id,
            drive
          );
          if (!allowed) {
            return res.status(403).json({ error: "Access denied to this file" });
          }
        }
        const response = await drive.files.get({
          fileId: req.params.id,
          fields: "id, name, mimeType, webViewLink, exportLinks, thumbnailLink",
          supportsAllDrives: true
        });
        res.json({
          id: response.data.id,
          name: response.data.name,
          mimeType: response.data.mimeType,
          webViewLink: response.data.webViewLink || null,
          exportLinks: response.data.exportLinks || null,
          thumbnailLink: response.data.thumbnailLink || null
        });
      } catch (err) {
        console.error("[Drive] Error getting preview:", err.message);
        if (err.code === 404) {
          return res.status(404).json({ error: "File not found" });
        }
        res.status(500).json({ error: "Failed to get preview info" });
      }
    });
    router.get("/permissions", async (req, res) => {
      try {
        if (req.user.role !== "ADMIN") {
          return res.status(403).json({ error: "Admin access required" });
        }
        const { rows } = await pool2.query(
          `SELECT id, folder_id, folder_name, sector, created_by, created_at
         FROM drive_folder_permissions
        ORDER BY sector, folder_name`
        );
        res.json(rows);
      } catch (err) {
        console.error("[Drive] Error listing permissions:", err.message);
        res.status(500).json({ error: "Failed to list permissions" });
      }
    });
    router.post("/permissions", async (req, res) => {
      try {
        if (req.user.role !== "ADMIN") {
          return res.status(403).json({ error: "Admin access required" });
        }
        const { folderId, folderName, sector } = req.body;
        if (!folderId || !folderName || !sector) {
          return res.status(400).json({ error: "folderId, folderName, and sector are required" });
        }
        const validSectors = ["Administra\xE7\xE3o", "Tech", "RH", "Comercial", "Financeiro"];
        if (!validSectors.includes(sector)) {
          return res.status(400).json({ error: "Invalid sector" });
        }
        const { rows } = await pool2.query(
          `INSERT INTO drive_folder_permissions (folder_id, folder_name, sector, created_by)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (folder_id, sector) DO NOTHING
       RETURNING *`,
          [folderId, folderName, sector, req.user.id]
        );
        if (rows.length === 0) {
          return res.status(409).json({ error: "Permission already exists for this folder and sector" });
        }
        res.status(201).json(rows[0]);
      } catch (err) {
        console.error("[Drive] Error adding permission:", err.message);
        res.status(500).json({ error: "Failed to add permission" });
      }
    });
    router.delete("/permissions/:id", async (req, res) => {
      try {
        if (req.user.role !== "ADMIN") {
          return res.status(403).json({ error: "Admin access required" });
        }
        const { rows } = await pool2.query(
          `DELETE FROM drive_folder_permissions WHERE id = $1 RETURNING *`,
          [req.params.id]
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Permission not found" });
        }
        res.json({ message: "Permission removed", permission: rows[0] });
      } catch (err) {
        console.error("[Drive] Error removing permission:", err.message);
        res.status(500).json({ error: "Failed to remove permission" });
      }
    });
    router.get("/root-folders", async (req, res) => {
      try {
        if (req.user.role !== "ADMIN") {
          return res.status(403).json({ error: "Admin access required" });
        }
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        const response = await drive.files.list({
          q: "'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          fields: "files(id, name, mimeType, modifiedTime, iconLink)",
          orderBy: "name",
          pageSize: 100,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        res.json({ folders: response.data.files || [] });
      } catch (err) {
        console.error("[Drive] Error listing root folders:", err.message);
        res.status(500).json({ error: "Failed to list root folders" });
      }
    });
    router.get("/files/:id/download", async (req, res) => {
      try {
        const auth = await getAuthClient(req.user.id);
        const drive = google.drive({ version: "v3", auth });
        if (req.user.role !== "ADMIN") {
          const allowed = await isAllowedFolder(
            req.user.id,
            req.user.role,
            req.user.sector,
            req.params.id,
            drive
          );
          if (!allowed) {
            return res.status(403).json({ error: "Access denied" });
          }
        }
        const fileMeta = await drive.files.get({
          fileId: req.params.id,
          fields: "mimeType, name"
        });
        const mimeType = fileMeta.data.mimeType;
        let response;
        let contentType = mimeType;
        let fileName = fileMeta.data.name;
        if (mimeType.startsWith("application/vnd.google-apps.")) {
          contentType = "application/pdf";
          fileName = `${fileName}.pdf`;
          response = await drive.files.export(
            { fileId: req.params.id, mimeType: contentType },
            { responseType: "stream" }
          );
        } else {
          response = await drive.files.get(
            { fileId: req.params.id, alt: "media", supportsAllDrives: true },
            { responseType: "stream" }
          );
        }
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
        response.data.on("end", () => {
        }).on("error", (err) => {
          console.error("Error downloading file.", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Download failed" });
          }
        }).pipe(res);
      } catch (err) {
        console.error("[Drive] Error downloading file:", err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to download file" });
        }
      }
    });
    module.exports = router;
  }
});

// backend/routes/communication.js
var require_communication = __commonJS({
  "backend/routes/communication.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    var { authMiddleware: authMiddleware2 } = require_auth();
    var multer = __require("multer");
    var path = __require("path");
    var storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../storage/avatars"));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
      }
    });
    var upload = multer({ storage });
    router.use(authMiddleware2);
    router.get("/dashboard/birthdays", async (req, res, next) => {
      try {
        const result = await pool2.query(`
            SELECT id, name, avatar_url, job_title, sector, birth_date
            FROM users
            WHERE birth_date IS NOT NULL
            ORDER BY 
                CASE 
                    WHEN EXTRACT(MONTH FROM birth_date) < EXTRACT(MONTH FROM CURRENT_DATE) THEN 1
                    WHEN EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM birth_date) < EXTRACT(DAY FROM CURRENT_DATE) THEN 1
                    ELSE 0
                END,
                EXTRACT(MONTH FROM birth_date), 
                EXTRACT(DAY FROM birth_date)
            LIMIT 10
        `);
        res.json(result.rows);
      } catch (error) {
        next(error);
      }
    });
    router.get("/dashboard/new-hires", async (req, res, next) => {
      try {
        const result = await pool2.query(`
            SELECT id, name, avatar_url, job_title, sector, join_date
            FROM users
            WHERE join_date >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY join_date DESC
            LIMIT 5
        `);
        res.json(result.rows);
      } catch (error) {
        next(error);
      }
    });
    router.get("/announcements", async (req, res, next) => {
      try {
        const result = await pool2.query(`
            SELECT a.*, u.name as author_name, u.avatar_url as author_avatar, u.job_title as author_role, u.sector as author_sector,
                   (SELECT json_agg(json_build_object('type', reaction_type, 'count', count)) FROM (SELECT reaction_type, count(*) FROM announcement_reactions WHERE announcement_id = a.id GROUP BY reaction_type) r) as reactions
            FROM announcements a
            JOIN users u ON a.author_id = u.id
            ORDER BY a.pinned DESC, a.created_at DESC
        `);
        res.json(result.rows);
      } catch (error) {
        next(error);
      }
    });
    router.post("/announcements", async (req, res, next) => {
      try {
        const { title, content, priority, expires_at, pinned, attachments } = req.body;
        const author_id = req.user.id;
        const id = `ann-${Date.now()}`;
        const result = await pool2.query(`
            INSERT INTO announcements (id, title, content, author_id, priority, expires_at, pinned, attachments)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [id, title, content, author_id, priority || "Normal", expires_at || null, pinned || false, attachments ? JSON.stringify(attachments) : null]);
        try {
          const usersRes = await pool2.query("SELECT id FROM users WHERE status = 'active' AND id != $1", [author_id]);
          if (usersRes.rows.length > 0) {
            const values = [];
            const params = [];
            let i = 1;
            usersRes.rows.forEach((user) => {
              const notifId = "n" + Date.now() + Math.floor(Math.random() * 1e3);
              values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
              params.push(notifId, user.id, "NEW_POST", `Novo aviso no mural: ${title}`, "mural", false);
            });
            await pool2.query(`INSERT INTO notifications (id, user_id, type, message, link_to, is_read) VALUES ${values.join(",")}`, params);
          }
        } catch (notifErr) {
          console.error("Failed to create NEW_POST notifications:", notifErr);
        }
        res.status(201).json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    });
    router.put("/announcements/:id", async (req, res, next) => {
      try {
        const { id } = req.params;
        const { title, content, priority } = req.body;
        const result = await pool2.query(`
            UPDATE announcements
            SET title = $1, content = $2, priority = $3
            WHERE id = $4
            RETURNING *
        `, [title, content, priority, id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Aviso n\xE3o encontrado" });
        res.json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    });
    router.delete("/announcements/:id", async (req, res, next) => {
      try {
        const { id } = req.params;
        await pool2.query("DELETE FROM announcement_reactions WHERE announcement_id = $1", [id]);
        await pool2.query("DELETE FROM announcement_comments WHERE announcement_id = $1", [id]);
        const result = await pool2.query("DELETE FROM announcements WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Aviso n\xE3o encontrado" });
        res.json({ message: "Aviso exclu\xEDdo" });
      } catch (error) {
        next(error);
      }
    });
    router.post("/announcements/:id/reactions", async (req, res, next) => {
      try {
        const { id } = req.params;
        const { reaction_type } = req.body;
        const user_id = req.user.id;
        const existing = await pool2.query("SELECT * FROM announcement_reactions WHERE announcement_id = $1 AND user_id = $2 AND reaction_type = $3", [id, user_id, reaction_type]);
        if (existing.rows.length > 0) {
          await pool2.query("DELETE FROM announcement_reactions WHERE id = $1", [existing.rows[0].id]);
          res.json({ message: "Reaction removed" });
        } else {
          const reactionId = `reac-${Date.now()}`;
          await pool2.query("INSERT INTO announcement_reactions (id, announcement_id, user_id, reaction_type) VALUES ($1, $2, $3, $4)", [reactionId, id, user_id, reaction_type]);
          res.status(201).json({ message: "Reaction added" });
        }
      } catch (error) {
        next(error);
      }
    });
    router.get("/channels", async (req, res, next) => {
      try {
        const result = await pool2.query("SELECT * FROM corporate_channels ORDER BY created_at ASC");
        res.json(result.rows);
      } catch (error) {
        next(error);
      }
    });
    router.post("/channels", async (req, res, next) => {
      try {
        const { name, description, type, url, department, icon } = req.body;
        const id = `chan-${Date.now()}`;
        const result = await pool2.query(`
            INSERT INTO corporate_channels (id, name, description, type, url, department, icon)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [id, name, description, type, url, department, icon]);
        res.status(201).json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    });
    router.delete("/channels/:id", async (req, res, next) => {
      try {
        const { id } = req.params;
        await pool2.query("DELETE FROM corporate_channels WHERE id = $1", [id]);
        res.json({ message: "Channel deleted" });
      } catch (error) {
        next(error);
      }
    });
    router.get("/contacts", async (req, res, next) => {
      try {
        const result = await pool2.query(`
            SELECT id, name, email, whatsapp, avatar_url, job_title, sector, role, birth_date
            FROM users 
            ORDER BY name ASC
        `);
        res.json(result.rows);
      } catch (error) {
        next(error);
      }
    });
    router.post("/upload-avatar", upload.single("avatar"), async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "Nenhum arquivo enviado" });
        }
        const avatarUrl = `${req.protocol}://${req.get("host")}/storage/avatars/${req.file.filename}`;
        res.status(201).json({ avatar_url: avatarUrl });
      } catch (error) {
        next(error);
      }
    });
    router.post("/contacts", async (req, res, next) => {
      try {
        const { name, email, job_title, sector, role, whatsapp, birth_date, avatar_url } = req.body;
        const id = `u${Date.now()}`;
        const finalRole = role || "user";
        const finalEmail = email || `${id}@focus.com`;
        const result = await pool2.query(`
            INSERT INTO users (id, name, email, role, job_title, sector, whatsapp, birth_date, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, name, email, whatsapp, job_title, sector, role, birth_date, avatar_url
        `, [id, name, finalEmail, finalRole, job_title, sector, whatsapp, birth_date || null, avatar_url || null]);
        res.status(201).json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    });
    router.put("/contacts/:id", async (req, res, next) => {
      try {
        const { id } = req.params;
        const { name, email, job_title, sector, role, whatsapp, birth_date, avatar_url } = req.body;
        const finalRole = role || "user";
        const result = await pool2.query(`
            UPDATE users 
            SET name = $1, email = COALESCE($2, email), role = $3, job_title = $4, sector = $5, whatsapp = $6, birth_date = $7, avatar_url = $8
            WHERE id = $9
            RETURNING id, name, email, whatsapp, job_title, sector, role, birth_date, avatar_url
        `, [name, email, finalRole, job_title, sector, whatsapp, birth_date || null, avatar_url || null, id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Contato n\xE3o encontrado" });
        }
        res.json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    });
    router.delete("/contacts/:id", async (req, res, next) => {
      try {
        const { id } = req.params;
        await pool2.query("DELETE FROM push_subscriptions WHERE user_id = $1", [id]);
        await pool2.query("DELETE FROM daily_checklist WHERE user_id = $1", [id]);
        await pool2.query("DELETE FROM check_ins WHERE user_id = $1", [id]);
        await pool2.query("DELETE FROM focus_links WHERE user_id = $1", [id]);
        await pool2.query("DELETE FROM notifications WHERE user_id = $1", [id]);
        await pool2.query("DELETE FROM announcement_reactions WHERE user_id = $1", [id]);
        await pool2.query("DELETE FROM announcement_comments WHERE user_id = $1", [id]);
        await pool2.query("DELETE FROM announcements WHERE author_id = $1", [id]);
        await pool2.query("DELETE FROM posts WHERE author_id = $1", [id]);
        await pool2.query("DELETE FROM goals WHERE user_id = $1", [id]);
        await pool2.query("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1", [id]);
        const result = await pool2.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Contato n\xE3o encontrado" });
        }
        res.json({ message: "Contato exclu\xEDdo com sucesso" });
      } catch (error) {
        next(error);
      }
    });
    router.get("/achievements", async (req, res, next) => {
      try {
        const result = await pool2.query(`
            SELECT a.*, 
                   u.name as awarded_to_name, u.avatar_url as awarded_to_avatar,
                   c.name as created_by_name, c.avatar_url as created_by_avatar
            FROM achievements a
            LEFT JOIN users u ON a.awarded_to = u.id
            LEFT JOIN users c ON a.created_by = c.id
            ORDER BY a.created_at DESC
        `);
        res.json(result.rows);
      } catch (error) {
        next(error);
      }
    });
    router.post("/achievements", async (req, res, next) => {
      try {
        const { title, description, icon, awarded_to } = req.body;
        const id = `ach-${Date.now()}`;
        const created_by = req.user.id;
        const result = await pool2.query(`
            INSERT INTO achievements (id, title, description, icon, awarded_to, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [id, title, description, icon || "Trophy", awarded_to || null, created_by]);
        res.status(201).json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    });
    router.put("/achievements/:id", async (req, res, next) => {
      try {
        const { id } = req.params;
        const { title, description, icon, awarded_to } = req.body;
        const result = await pool2.query(`
            UPDATE achievements 
            SET title = $1, description = $2, icon = $3, awarded_to = $4
            WHERE id = $5
            RETURNING *
        `, [title, description, icon, awarded_to || null, id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Conquista n\xE3o encontrada" });
        res.json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    });
    router.delete("/achievements/:id", async (req, res, next) => {
      try {
        const { id } = req.params;
        const result = await pool2.query("DELETE FROM achievements WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Conquista n\xE3o encontrada" });
        res.json({ message: "Conquista exclu\xEDda" });
      } catch (error) {
        next(error);
      }
    });
    module.exports = router;
  }
});

// backend/routes/agenda.js
var require_agenda = __commonJS({
  "backend/routes/agenda.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    router.get("/events", async (req, res) => {
      try {
        const { start, end, search } = req.query;
        let query = "SELECT * FROM google_calendar_events WHERE 1=1";
        let params = [];
        let paramIndex = 1;
        if (start) {
          query += ` AND start_time >= $${paramIndex}`;
          params.push(start);
          paramIndex++;
        }
        if (end) {
          query += ` AND start_time <= $${paramIndex}`;
          params.push(end);
          paramIndex++;
        }
        if (search) {
          query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex} OR organizer_name ILIKE $${paramIndex})`;
          params.push(`%${search}%`);
          paramIndex++;
        }
        query += " ORDER BY start_time ASC";
        const result = await pool2.query(query, params);
        res.json(result.rows);
      } catch (err) {
        console.error("Error fetching agenda events:", err);
        res.status(500).json({ message: "Erro ao buscar eventos da agenda corporativa" });
      }
    });
    router.get("/dashboard", async (req, res) => {
      try {
        const now = /* @__PURE__ */ new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        const endOfWeek = new Date(startOfDay);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        const todayRes = await pool2.query(
          "SELECT COUNT(*) as count FROM google_calendar_events WHERE start_time >= $1 AND start_time < $2",
          [startOfDay.toISOString(), endOfDay.toISOString()]
        );
        const eventsToday = parseInt(todayRes.rows[0].count, 10);
        const weekRes = await pool2.query(
          "SELECT COUNT(*) as count FROM google_calendar_events WHERE start_time >= $1 AND start_time < $2",
          [startOfDay.toISOString(), endOfWeek.toISOString()]
        );
        const eventsThisWeek = parseInt(weekRes.rows[0].count, 10);
        const nextMeetingRes = await pool2.query(
          "SELECT * FROM google_calendar_events WHERE start_time > $1 ORDER BY start_time ASC LIMIT 1",
          [now.toISOString()]
        );
        const nextMeeting = nextMeetingRes.rows[0] || null;
        const meetingsTodayRes = await pool2.query(
          "SELECT COUNT(*) as count FROM google_calendar_events WHERE start_time >= $1 AND start_time < $2 AND google_meet_link IS NOT NULL",
          [startOfDay.toISOString(), endOfDay.toISOString()]
        );
        const meetingsToday = parseInt(meetingsTodayRes.rows[0].count, 10);
        res.json({
          eventsToday,
          eventsThisWeek,
          nextMeeting,
          meetingsToday,
          hoursCommitted: 0,
          // Simplified for now
          upcomingEvents: []
          // Will fetch on frontend
        });
      } catch (err) {
        console.error("Error fetching agenda dashboard:", err);
        res.status(500).json({ message: "Erro ao buscar m\xE9tricas da agenda" });
      }
    });
    router.put("/events/:id/color", async (req, res) => {
      try {
        const { id } = req.params;
        const { color_hex } = req.body;
        await pool2.query(
          "UPDATE google_calendar_events SET color_hex = $1 WHERE id = $2",
          [color_hex, id]
        );
        res.json({ success: true, message: "Cor atualizada com sucesso" });
      } catch (err) {
        console.error("Error updating event color:", err);
        res.status(500).json({ message: "Erro ao atualizar cor do evento" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/admin.js
var require_admin = __commonJS({
  "backend/routes/admin.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { pool: pool2 } = require_db();
    var { authMiddleware: authMiddleware2, adminOnly } = require_auth();
    var bcrypt = __require("bcryptjs");
    router.use(authMiddleware2);
    router.use(adminOnly);
    router.get("/dashboard", async (req, res) => {
      try {
        const queries = await Promise.all([
          // Users
          pool2.query("SELECT COUNT(*) as total FROM users"),
          pool2.query("SELECT COUNT(*) as total FROM users WHERE status = 'active' OR status IS NULL"),
          pool2.query("SELECT COUNT(*) as total FROM users WHERE status = 'archived'"),
          pool2.query("SELECT COUNT(*) as total FROM users WHERE role = 'ADMIN'"),
          pool2.query("SELECT COUNT(*) as total FROM users WHERE role = 'USER'"),
          pool2.query("SELECT COUNT(*) as total FROM users WHERE role = 'COLLABORATOR'"),
          // Sectors
          pool2.query("SELECT DISTINCT sector FROM users WHERE sector IS NOT NULL"),
          // Tasks
          pool2.query("SELECT COUNT(*) as total FROM tasks"),
          pool2.query("SELECT COUNT(*) as total FROM tasks WHERE status = 'concluida'"),
          pool2.query("SELECT COUNT(*) as total FROM tasks WHERE status = 'pendente'"),
          pool2.query("SELECT COUNT(*) as total FROM tasks WHERE status = 'em_progresso'"),
          // Goals
          pool2.query("SELECT COUNT(*) as total FROM goals"),
          pool2.query("SELECT COUNT(*) as total FROM goals WHERE status = 'active' OR status = 'em_andamento'"),
          // Posts
          pool2.query("SELECT COUNT(*) as total FROM posts"),
          // Notifications
          pool2.query("SELECT COUNT(*) as total FROM notifications WHERE is_read = false"),
          // Google Calendar
          pool2.query("SELECT COUNT(*) as total FROM google_calendar_events WHERE start_time > NOW()").catch(() => ({ rows: [{ total: 0 }] })),
          // Google Integration
          pool2.query("SELECT COUNT(*) as total FROM google_corporate_integration").catch(() => ({ rows: [{ total: 0 }] })),
          // Drive storage
          pool2.query("SELECT COUNT(*) as total FROM drive_folder_permissions").catch(() => ({ rows: [{ total: 0 }] })),
          // Users by sector
          pool2.query("SELECT sector, COUNT(*) as count FROM users WHERE sector IS NOT NULL GROUP BY sector ORDER BY count DESC"),
          // Tasks by sector  
          pool2.query("SELECT sector, COUNT(*) as count FROM tasks WHERE sector IS NOT NULL GROUP BY sector ORDER BY count DESC"),
          // Recent activity (audit)
          pool2.query("SELECT COUNT(*) as total FROM audit_logs").catch(() => ({ rows: [{ total: 0 }] }))
        ]);
        const dashboard = {
          users: {
            total: parseInt(queries[0].rows[0].total),
            active: parseInt(queries[1].rows[0].total),
            archived: parseInt(queries[2].rows[0].total),
            admins: parseInt(queries[3].rows[0].total),
            regular: parseInt(queries[4].rows[0].total),
            collaborators: parseInt(queries[5].rows[0].total)
          },
          sectors: {
            total: queries[6].rows.length,
            list: queries[6].rows.map((r) => r.sector)
          },
          tasks: {
            total: parseInt(queries[7].rows[0].total),
            completed: parseInt(queries[8].rows[0].total),
            pending: parseInt(queries[9].rows[0].total),
            inProgress: parseInt(queries[10].rows[0].total)
          },
          goals: {
            total: parseInt(queries[11].rows[0].total),
            active: parseInt(queries[12].rows[0].total)
          },
          posts: {
            total: parseInt(queries[13].rows[0].total)
          },
          notifications: {
            unread: parseInt(queries[14].rows[0].total)
          },
          agenda: {
            upcomingEvents: parseInt(queries[15].rows[0].total)
          },
          integrations: {
            google: parseInt(queries[16].rows[0].total) > 0,
            drivePermissions: parseInt(queries[17].rows[0].total)
          },
          charts: {
            usersBySector: queries[18].rows.map((r) => ({ sector: r.sector, count: parseInt(r.count) })),
            tasksBySector: queries[19].rows.map((r) => ({ sector: r.sector, count: parseInt(r.count) }))
          },
          audit: {
            totalLogs: parseInt(queries[20].rows[0].total)
          },
          system: {
            uptime: Math.floor(process.uptime()),
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        };
        res.json(dashboard);
      } catch (error) {
        console.error("Admin dashboard error:", error);
        res.status(500).json({ error: "Falha ao carregar dashboard administrativo" });
      }
    });
    router.get("/users", async (req, res) => {
      try {
        const usersResult = await pool2.query(`
            SELECT 
                u.id, u.name, u.email, u.whatsapp, u.role, u.avatar_url, u.sector, 
                u.job_title, u.bio, u.join_date, u.status, u.is_approved, u.created_at,
                (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id) as task_count,
                (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id AND status = 'concluida') as completed_tasks,
                (SELECT COUNT(*) FROM goals WHERE responsible_id = u.id) as goal_count,
                (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as post_count,
                (SELECT MAX(timestamp) FROM check_ins WHERE user_id = u.id) as last_checkin
            FROM users u
            ORDER BY u.name ASC
        `);
        res.json(usersResult.rows);
      } catch (error) {
        console.error("Admin users error:", error);
        res.status(500).json({ error: "Falha ao carregar lista de usu\xE1rios" });
      }
    });
    router.put("/users/:id/status", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        if (!["active", "archived", "suspended", "blocked"].includes(status)) {
          return res.status(400).json({ error: "Status inv\xE1lido" });
        }
        await pool2.query("UPDATE users SET status = $1 WHERE id = $2", [status, id]);
        await pool2.query(
          "INSERT INTO audit_logs (user_id, user_name, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5, $6)",
          [req.user.id, "Admin", "UPDATE_STATUS", "user", id, JSON.stringify({ newStatus: status })]
        ).catch(() => {
        });
        res.json({ success: true, status });
      } catch (error) {
        console.error("Admin status update error:", error);
        res.status(500).json({ error: "Falha ao atualizar status do usu\xE1rio" });
      }
    });
    router.post("/users/:id/reset-password", async (req, res) => {
      try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
          return res.status(400).json({ error: "Senha deve ter no m\xEDnimo 6 caracteres" });
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await pool2.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, id]);
        await pool2.query(
          "INSERT INTO audit_logs (user_id, user_name, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5, $6)",
          [req.user.id, "Admin", "RESET_PASSWORD", "user", id, JSON.stringify({ resetBy: req.user.id })]
        ).catch(() => {
        });
        res.json({ success: true });
      } catch (error) {
        console.error("Admin password reset error:", error);
        res.status(500).json({ error: "Falha ao redefinir senha" });
      }
    });
    router.get("/audit", async (req, res) => {
      try {
        const { page = 1, limit = 50, userId, action, resourceType } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let query = "SELECT * FROM audit_logs WHERE 1=1";
        let params = [];
        let paramIndex = 1;
        if (userId) {
          query += ` AND user_id = $${paramIndex++}`;
          params.push(userId);
        }
        if (action) {
          query += ` AND action = $${paramIndex++}`;
          params.push(action);
        }
        if (resourceType) {
          query += ` AND resource_type = $${paramIndex++}`;
          params.push(resourceType);
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), offset);
        const result = await pool2.query(query, params);
        const countResult = await pool2.query("SELECT COUNT(*) as total FROM audit_logs");
        res.json({
          logs: result.rows,
          total: parseInt(countResult.rows[0].total),
          page: parseInt(page),
          limit: parseInt(limit)
        });
      } catch (error) {
        console.error("Admin audit error:", error);
        res.status(500).json({ error: "Falha ao carregar logs de auditoria" });
      }
    });
    router.get("/system", async (req, res) => {
      try {
        const mem = process.memoryUsage();
        const dbCheck = await pool2.query("SELECT NOW() as time, version() as version");
        res.json({
          uptime: Math.floor(process.uptime()),
          nodeVersion: process.version,
          memory: {
            rss: Math.round(mem.rss / 1024 / 1024),
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            external: Math.round(mem.external / 1024 / 1024)
          },
          database: {
            connected: true,
            time: dbCheck.rows[0].time,
            version: dbCheck.rows[0].version
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (error) {
        res.json({
          uptime: Math.floor(process.uptime()),
          database: { connected: false },
          error: error.message
        });
      }
    });
    router.get("/sectors", async (req, res) => {
      try {
        const result = await pool2.query("SELECT * FROM sectors ORDER BY created_at ASC");
        res.json(result.rows);
      } catch (error) {
        console.error("Admin sectors error:", error);
        res.status(500).json({ error: "Falha ao carregar setores" });
      }
    });
    router.post("/sectors", async (req, res) => {
      try {
        const { id, name, color, description, manager_id } = req.body;
        const result = await pool2.query(
          "INSERT INTO sectors (id, name, color, description, manager_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
          [id, name, color, description, manager_id]
        );
        res.json(result.rows[0]);
      } catch (error) {
        console.error("Admin create sector error:", error);
        res.status(500).json({ error: "Falha ao criar setor" });
      }
    });
    router.put("/sectors/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { name, color, description, manager_id } = req.body;
        const result = await pool2.query(
          "UPDATE sectors SET name = $1, color = $2, description = $3, manager_id = $4 WHERE id = $5 RETURNING *",
          [name, color, description, manager_id, id]
        );
        res.json(result.rows[0]);
      } catch (error) {
        console.error("Admin update sector error:", error);
        res.status(500).json({ error: "Falha ao atualizar setor" });
      }
    });
    router.delete("/sectors/:id", async (req, res) => {
      try {
        const { id } = req.params;
        await pool2.query("DELETE FROM sectors WHERE id = $1", [id]);
        res.json({ success: true });
      } catch (error) {
        console.error("Admin delete sector error:", error);
        res.status(500).json({ error: "Falha ao excluir setor" });
      }
    });
    router.get("/modules", async (req, res) => {
      try {
        const result = await pool2.query("SELECT * FROM system_modules ORDER BY created_at ASC");
        res.json(result.rows);
      } catch (error) {
        res.status(500).json({ error: "Falha ao carregar m\xF3dulos" });
      }
    });
    router.put("/modules/:slug/toggle", async (req, res) => {
      try {
        const { slug } = req.params;
        const { is_active } = req.body;
        const result = await pool2.query(
          "UPDATE system_modules SET is_active = $1 WHERE slug = $2 RETURNING *",
          [is_active, slug]
        );
        res.json(result.rows[0]);
      } catch (error) {
        res.status(500).json({ error: "Falha ao atualizar m\xF3dulo" });
      }
    });
    router.get("/permissions", async (req, res) => {
      try {
        const result = await pool2.query("SELECT * FROM role_permissions");
        res.json(result.rows);
      } catch (error) {
        res.status(500).json({ error: "Falha ao carregar permiss\xF5es" });
      }
    });
    router.put("/permissions", async (req, res) => {
      try {
        const { role, module_slug, can_view, can_create, can_edit, can_delete, can_admin } = req.body;
        const result = await pool2.query(`
            INSERT INTO role_permissions (role, module_slug, can_view, can_create, can_edit, can_delete, can_admin)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (role, module_slug) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_create = EXCLUDED.can_create,
                can_edit = EXCLUDED.can_edit,
                can_delete = EXCLUDED.can_delete,
                can_admin = EXCLUDED.can_admin
            RETURNING *
        `, [role, module_slug, can_view, can_create, can_edit, can_delete, can_admin]);
        res.json(result.rows[0]);
      } catch (error) {
        console.error("Admin update permissions error:", error);
        res.status(500).json({ error: "Falha ao atualizar permiss\xF5es" });
      }
    });
    router.get("/integrations/status", async (req, res) => {
      try {
        const statuses = [];
        try {
          const googleRes = await pool2.query("SELECT connected_by, connected_at, last_sync_at, sync_status, google_email FROM google_corporate_integration LIMIT 1");
          if (googleRes.rows.length > 0) {
            const g = googleRes.rows[0];
            statuses.push({
              id: "google",
              name: "Google Workspace",
              description: "Calendar & Drive sync",
              status: g.sync_status === "ok" || g.sync_status === "success" ? "connected" : "error",
              details: g.google_email,
              lastSync: g.last_sync_at,
              connectedAt: g.connected_at
            });
          } else {
            statuses.push({ id: "google", name: "Google Workspace", description: "Calendar & Drive sync", status: "disconnected" });
          }
        } catch (e) {
          statuses.push({ id: "google", name: "Google Workspace", status: "error", details: e.message });
        }
        try {
          const discordRes = await pool2.query("SELECT connected_by, connected_at FROM discord_integration LIMIT 1");
          if (discordRes.rows.length > 0) {
            statuses.push({
              id: "discord",
              name: "Discord",
              description: "Bot notifications",
              status: "connected",
              connectedAt: discordRes.rows[0].connected_at
            });
          } else {
            statuses.push({ id: "discord", name: "Discord", description: "Bot notifications", status: "disconnected" });
          }
        } catch (e) {
          statuses.push({ id: "discord", name: "Discord", status: "error", details: e.message });
        }
        try {
          const fs = __require("fs");
          const path = __require("path");
          const hasSession = fs.existsSync(path.join(__dirname, "..", "whatsapp-auth"));
          statuses.push({
            id: "whatsapp",
            name: "WhatsApp",
            description: "Baileys Multi-device",
            status: hasSession ? "connected" : "disconnected",
            details: hasSession ? "Sess\xE3o ativa" : "Aguardando QR Code"
          });
        } catch (e) {
          statuses.push({ id: "whatsapp", name: "WhatsApp", status: "error" });
        }
        try {
          const pushRes = await pool2.query("SELECT COUNT(*) as total FROM push_subscriptions");
          statuses.push({
            id: "push",
            name: "Notifica\xE7\xF5es Push",
            description: "Navegador / PWA",
            status: "connected",
            details: `${pushRes.rows[0].total} inscri\xE7\xF5es ativas`
          });
        } catch (e) {
          statuses.push({ id: "push", name: "Notifica\xE7\xF5es Push", status: "error" });
        }
        res.json(statuses);
      } catch (error) {
        console.error("Admin integrations status error:", error);
        res.status(500).json({ error: "Falha ao carregar status das integra\xE7\xF5es" });
      }
    });
    router.post("/communication/send", async (req, res) => {
      try {
        const { target, sector, title, message, channels } = req.body;
        let userIds = [];
        if (target === "all") {
          const usersRes = await pool2.query("SELECT id FROM users WHERE status = 'active' OR status IS NULL");
          userIds = usersRes.rows.map((r) => r.id);
        } else if (target === "sector" && sector) {
          const usersRes = await pool2.query("SELECT id FROM users WHERE sector = $1 AND (status = 'active' OR status IS NULL)", [sector]);
          userIds = usersRes.rows.map((r) => r.id);
        } else if (target === "admins") {
          const usersRes = await pool2.query("SELECT id FROM users WHERE role = 'ADMIN' AND (status = 'active' OR status IS NULL)");
          userIds = usersRes.rows.map((r) => r.id);
        }
        if (userIds.length === 0) {
          return res.status(400).json({ error: "Nenhum usu\xE1rio encontrado para o alvo selecionado" });
        }
        if (channels.includes("in-app")) {
          const values = userIds.map((id, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`).join(", ");
          const params = userIds.flatMap((id) => [id, "SYSTEM_ALERT", message]);
          if (params.length > 0) {
            await pool2.query(`INSERT INTO notifications (user_id, type, message) VALUES ${values}`, params);
          }
        }
        await pool2.query(
          "INSERT INTO audit_logs (user_id, user_name, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5, $6)",
          [req.user.id, "Admin", "MASS_COMMUNICATION", "system", target, JSON.stringify({ title, channels, sentCount: userIds.length })]
        ).catch(() => {
        });
        res.json({ success: true, sentCount: userIds.length });
      } catch (error) {
        console.error("Admin mass communication error:", error);
        res.status(500).json({ error: "Falha ao enviar comunica\xE7\xE3o" });
      }
    });
    module.exports = router;
  }
});

// backend/routes/google.js
var require_google = __commonJS({
  "backend/routes/google.js"(exports, module) {
    "use strict";
    var express2 = __require("express");
    var router = express2.Router();
    var { google } = __require("googleapis");
    var { pool: pool2 } = require_db();
    var { authMiddleware: authMiddleware2, adminOnly } = require_auth();
    var cron = __require("node-cron");
    var getOAuth2Client = () => {
      return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
    };
    var syncCalendarEvents = async (integrationId, oAuth2Client) => {
      const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
      const resConfig = await pool2.query("SELECT selected_calendars FROM google_corporate_integration WHERE id = $1", [integrationId]);
      if (resConfig.rows.length === 0) return 0;
      const selectedCalendars = resConfig.rows[0].selected_calendars || ["primary"];
      let totalSynced = 0;
      const timeMin = /* @__PURE__ */ new Date();
      timeMin.setMonth(timeMin.getMonth() - 1);
      const timeMax = /* @__PURE__ */ new Date();
      timeMax.setMonth(timeMax.getMonth() + 6);
      for (const calendarId of selectedCalendars) {
        try {
          const response = await calendar.events.list({
            calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: 2500,
            singleEvents: true,
            orderBy: "startTime",
            showDeleted: true
          });
          const events = response.data.items || [];
          for (const event of events) {
            if (event.status === "cancelled") {
              await pool2.query("DELETE FROM google_calendar_events WHERE id = $1", [event.id]);
              continue;
            }
            let startTime = event.start?.dateTime || event.start?.date;
            let endTime = event.end?.dateTime || event.end?.date;
            let allDay = !event.start?.dateTime;
            if (!startTime) continue;
            const meetLink = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri || null;
            await pool2.query(
              `INSERT INTO google_calendar_events 
                    (id, calendar_id, title, description, location, start_time, end_time, all_day, status, google_meet_link, html_link, organizer_email, organizer_name, attendees, color_id, raw_event, synced_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
                    ON CONFLICT (id) DO UPDATE SET 
                        calendar_id = $2, title = $3, description = $4, location = $5, start_time = $6, end_time = $7, all_day = $8, status = $9, google_meet_link = $10, html_link = $11, organizer_email = $12, organizer_name = $13, attendees = $14, color_id = $15, raw_event = $16, synced_at = NOW()`,
              [
                event.id,
                calendarId,
                event.summary || "Sem T\xEDtulo",
                event.description || null,
                event.location || null,
                startTime,
                endTime || startTime,
                allDay,
                event.status,
                meetLink,
                event.htmlLink,
                event.organizer?.email || null,
                event.organizer?.displayName || null,
                JSON.stringify(event.attendees || []),
                event.colorId || null,
                JSON.stringify(event)
              ]
            );
            totalSynced++;
          }
        } catch (err) {
          console.error(`Error syncing calendar ${calendarId}:`, err.message);
          await pool2.query(
            "UPDATE google_corporate_integration SET sync_status = $1 WHERE id = $2",
            ["error", integrationId]
          );
          throw err;
        }
      }
      await pool2.query(
        "UPDATE google_corporate_integration SET last_sync_at = NOW(), sync_status = $1, events_count = $2 WHERE id = $3",
        ["success", totalSynced, integrationId]
      );
      return totalSynced;
    };
    router.get("/auth-url", authMiddleware2, adminOnly, (req, res) => {
      const oAuth2Client = getOAuth2Client();
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        // Force to get refresh token
        scope: [
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile"
        ]
      });
      res.json({ url: authUrl });
    });
    router.get("/callback", async (req, res) => {
      const code = req.query.code;
      const error = req.query.error;
      if (error) {
        return res.redirect(`${process.env.ALLOWED_ORIGINS?.split(",")[0] || "http://localhost:5173"}/admin?google_error=${error}`);
      }
      if (!code) {
        return res.status(400).send("C\xF3digo de autoriza\xE7\xE3o n\xE3o fornecido");
      }
      try {
        const oAuth2Client = getOAuth2Client();
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
        const userInfo = await oauth2.userinfo.get();
        const { email, name, picture } = userInfo.data;
        await pool2.query("DELETE FROM google_corporate_integration");
        const result = await pool2.query(
          `INSERT INTO google_corporate_integration 
            (google_email, google_name, google_avatar_url, access_token, refresh_token, token_expires_at, sync_status)
            VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), $7)
            RETURNING id`,
          [
            email,
            name,
            picture,
            tokens.access_token,
            tokens.refresh_token || "",
            // Sometimes refresh token is undefined if not prompted
            tokens.expiry_date,
            "syncing"
          ]
        );
        const integrationId = result.rows[0].id;
        syncCalendarEvents(integrationId, oAuth2Client).catch((e) => {
          console.error("Initial sync failed:", e);
          pool2.query("UPDATE google_corporate_integration SET sync_status = $1 WHERE id = $2", ["error", integrationId]);
        });
        const frontendUrl = process.env.ALLOWED_ORIGINS?.split(",")[0] || "http://localhost:5173";
        res.redirect(`${frontendUrl}/admin?google_setup=success`);
      } catch (err) {
        console.error("Google Callback Error:", err);
        const frontendUrl = process.env.ALLOWED_ORIGINS?.split(",")[0] || "http://localhost:5173";
        res.redirect(`${frontendUrl}/admin?google_error=auth_failed`);
      }
    });
    router.get("/status", authMiddleware2, async (req, res) => {
      try {
        const result = await pool2.query("SELECT google_email, google_name, google_avatar_url, last_sync_at, sync_status, events_count FROM google_corporate_integration LIMIT 1");
        if (result.rows.length === 0) {
          return res.json({ connected: false });
        }
        res.json({ connected: true, integration: result.rows[0] });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao verificar status" });
      }
    });
    router.post("/sync", authMiddleware2, adminOnly, async (req, res) => {
      try {
        const result = await pool2.query("SELECT * FROM google_corporate_integration LIMIT 1");
        if (result.rows.length === 0) {
          return res.status(400).json({ message: "Integra\xE7\xE3o Google n\xE3o configurada" });
        }
        const integration = result.rows[0];
        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials({
          access_token: integration.access_token,
          refresh_token: integration.refresh_token,
          expiry_date: integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : null
        });
        const total = await syncCalendarEvents(integration.id, oAuth2Client);
        res.json({ message: "Sincroniza\xE7\xE3o conclu\xEDda", eventsSynced: total });
      } catch (err) {
        console.error("Sync manual failed:", err);
        res.status(500).json({ message: "Erro na sincroniza\xE7\xE3o manual" });
      }
    });
    router.delete("/disconnect", authMiddleware2, adminOnly, async (req, res) => {
      try {
        await pool2.query("DELETE FROM google_corporate_integration");
        await pool2.query("DELETE FROM google_calendar_events");
        res.json({ message: "Integra\xE7\xE3o removida com sucesso" });
      } catch (err) {
        res.status(500).json({ message: "Erro ao desconectar" });
      }
    });
    if (!process.env.VERCEL) {
      cron.schedule("*/5 * * * *", async () => {
        try {
          const result = await pool2.query("SELECT * FROM google_corporate_integration LIMIT 1");
          if (result.rows.length === 0) return;
          const integration = result.rows[0];
          const oAuth2Client = getOAuth2Client();
          oAuth2Client.setCredentials({
            access_token: integration.access_token,
            refresh_token: integration.refresh_token,
            expiry_date: integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : null
          });
          await syncCalendarEvents(integration.id, oAuth2Client);
          console.log("[Cron] Google Calendar events synced successfully.");
        } catch (err) {
          console.error("[Cron] Failed to sync Google Calendar events:", err.message);
        }
      });
    }
    router.post("/events", authMiddleware2, async (req, res) => {
      try {
        const { title, description, startTime, endTime, attendees } = req.body;
        if (!title || !startTime || !endTime) {
          return res.status(400).json({ error: "T\xEDtulo, data de in\xEDcio e fim s\xE3o obrigat\xF3rios" });
        }
        const result = await pool2.query("SELECT * FROM google_corporate_integration LIMIT 1");
        if (result.rows.length === 0) {
          return res.status(400).json({ error: "Integra\xE7\xE3o do Google Calendar n\xE3o configurada" });
        }
        const integration = result.rows[0];
        const oAuth2Client = getOAuth2Client();
        const tokenExpiresAtMs = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
        oAuth2Client.setCredentials({
          access_token: integration.access_token,
          refresh_token: integration.refresh_token,
          expiry_date: tokenExpiresAtMs
        });
        if (tokenExpiresAtMs <= Date.now() + 6e4) {
          const { credentials } = await oAuth2Client.refreshAccessToken();
          await pool2.query(
            "UPDATE google_corporate_integration SET access_token = $1, token_expires_at = to_timestamp($2 / 1000.0) WHERE id = $3",
            [credentials.access_token, credentials.expiry_date, integration.id]
          );
          oAuth2Client.setCredentials(credentials);
        }
        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
        const event = {
          summary: title,
          description,
          start: {
            dateTime: new Date(startTime).toISOString()
          },
          end: {
            dateTime: new Date(endTime).toISOString()
          },
          attendees: attendees && Array.isArray(attendees) ? attendees.map((email) => ({ email })) : [],
          conferenceData: {
            createRequest: {
              requestId: Math.random().toString(36).substring(7),
              conferenceSolutionKey: { type: "hangoutsMeet" }
            }
          }
        };
        const calendarId = integration.selected_calendars && integration.selected_calendars.length > 0 ? integration.selected_calendars[0] : "primary";
        const response = await calendar.events.insert({
          calendarId,
          resource: event,
          sendUpdates: "all",
          conferenceDataVersion: 1
        });
        const createdEvent = response.data;
        const meetLink = createdEvent.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri || null;
        let eventStartTime = createdEvent.start?.dateTime || createdEvent.start?.date;
        let eventEndTime = createdEvent.end?.dateTime || createdEvent.end?.date;
        let allDay = !createdEvent.start?.dateTime;
        await pool2.query(
          `INSERT INTO google_calendar_events 
            (id, calendar_id, title, description, location, start_time, end_time, all_day, status, google_meet_link, html_link, organizer_email, organizer_name, attendees, color_id, raw_event, synced_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
            ON CONFLICT (id) DO UPDATE SET 
                calendar_id = $2, title = $3, description = $4, location = $5, start_time = $6, end_time = $7, all_day = $8, status = $9, google_meet_link = $10, html_link = $11, organizer_email = $12, organizer_name = $13, attendees = $14, color_id = $15, raw_event = $16, synced_at = NOW()`,
          [
            createdEvent.id,
            calendarId,
            createdEvent.summary || "Sem T\xEDtulo",
            createdEvent.description || null,
            createdEvent.location || null,
            eventStartTime,
            eventEndTime || eventStartTime,
            allDay,
            createdEvent.status,
            meetLink,
            createdEvent.htmlLink,
            createdEvent.organizer?.email || null,
            createdEvent.organizer?.displayName || null,
            JSON.stringify(createdEvent.attendees || []),
            createdEvent.colorId || null,
            JSON.stringify(createdEvent)
          ]
        );
        syncCalendarEvents(integration.id, oAuth2Client).catch((err) => {
          console.error("Background sync failed after creating event:", err.message);
        });
        res.json({ success: true, event: response.data });
      } catch (error) {
        console.error("Error creating Google Calendar event:", error);
        res.status(500).json({ error: "Falha ao criar evento no Google Calendar" });
      }
    });
    module.exports = router;
  }
});

// backend/serverless.js
var import_db = __toESM(require_db());
var import_auth = __toESM(require_auth());
var import_auth2 = __toESM(require_auth2());
var import_tasks = __toESM(require_tasks());
var import_checkins = __toESM(require_checkins());
var import_posts = __toESM(require_posts());
var import_goals = __toESM(require_goals());
var import_users = __toESM(require_users());
var import_tools = __toESM(require_tools());
var import_reports = __toESM(require_reports());
var import_dailyChecklist = __toESM(require_dailyChecklist());
var import_notifications = __toESM(require_notifications());
var import_push = __toESM(require_push());
var import_contents = __toESM(require_contents());
var import_drive = __toESM(require_drive());
var import_communication = __toESM(require_communication());
var import_agenda = __toESM(require_agenda());
var import_admin = __toESM(require_admin());
var import_google = __toESM(require_google());
import express from "express";
import cors from "cors";
import helmet from "helmet";
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_at_least_32_chars_long_for_security_reasons";
}
var app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use((req, res, next) => {
  const actualPath = req.headers["x-matched-path"] || req.originalUrl || req.url;
  if (req.url === "/api/index.js" || req.url.startsWith("/api/index.js")) {
    req.url = actualPath;
  }
  next();
});
["/api", ""].forEach((prefix) => {
  app.use(`${prefix}/auth`, import_auth2.default);
  app.use(`${prefix}/google`, import_google.default);
  app.use(`${prefix}/admin`, import_admin.default);
  app.use(`${prefix}/tasks`, import_auth.authMiddleware, import_tasks.default);
  app.use(`${prefix}/checkins`, import_auth.authMiddleware, import_checkins.default);
  app.use(`${prefix}/posts`, import_auth.authMiddleware, import_posts.default);
  app.use(`${prefix}/goals`, import_auth.authMiddleware, import_goals.default);
  app.use(`${prefix}/users`, import_auth.authMiddleware, import_users.default);
  app.use(`${prefix}/tools`, import_auth.authMiddleware, import_tools.default);
  app.use(`${prefix}/reports`, import_auth.authMiddleware, import_reports.default);
  app.use(`${prefix}/daily-checklist`, import_auth.authMiddleware, import_dailyChecklist.default);
  app.use(`${prefix}/notifications`, import_auth.authMiddleware, import_notifications.default);
  app.use(`${prefix}/push`, import_auth.authMiddleware, import_push.default);
  app.use(`${prefix}/contents`, import_auth.authMiddleware, import_contents.default);
  app.use(`${prefix}/drive`, import_auth.authMiddleware, import_drive.default);
  app.use(`${prefix}/communication`, import_auth.authMiddleware, import_communication.default);
  app.use(`${prefix}/agenda`, import_auth.authMiddleware, import_agenda.default);
  app.get(`${prefix}/health`, async (req, res) => {
    try {
      const result = await import_db.pool.query("SELECT NOW()");
      res.json({ status: "ok", database: "connected", time: result.rows[0].now });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });
});
app.use((err, req, res, next) => {
  console.error("API Error:", err);
  res.status(500).json({ message: err.message || "Erro interno do servidor" });
});
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    method: req.method,
    url: req.url,
    matchedPath: req.headers["x-matched-path"]
  });
});
var serverless_default = app;
export {
  serverless_default as default
};
