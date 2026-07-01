import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

// Path for temporary file execution inside workspace
const TEMP_DIR = path.join(process.cwd(), "temp_submissions");

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, language, input = "" } = body;

    // Validate language selection
    const supportedLanguages = ["javascript", "python", "c", "cpp", "java", "javan"]; 
    if (!language || !supportedLanguages.includes(language.toLowerCase())) {
      return NextResponse.json({ error: "Unsupported or missing language" }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    let filename = "";
    let execCmd = "";
    let compileCmd = "";
    let cleanupFiles: string[] = [];

    // Map language parameters
    const lang = language?.toLowerCase();

    if (lang === "javascript") {
      filename = `script_${uniqueId}.js`;
      const filePath = path.join(TEMP_DIR, filename);
      fs.writeFileSync(filePath, code);
      execCmd = `node "${filePath}"`;
      cleanupFiles.push(filePath);
    } else if (lang === "python") {
      filename = `script_${uniqueId}.py`;
      const filePath = path.join(TEMP_DIR, filename);
      fs.writeFileSync(filePath, code);
      // Fallback check between python and python3
      execCmd = `python "${filePath}"`;
      cleanupFiles.push(filePath);
    } else if (lang === "c") {
      filename = `program_${uniqueId}.c`;
      const binaryName = `program_${uniqueId}.exe`;
      const filePath = path.join(TEMP_DIR, filename);
      const binaryPath = path.join(TEMP_DIR, binaryName);
      fs.writeFileSync(filePath, code);
      compileCmd = `gcc "${filePath}" -o "${binaryPath}"`;
      execCmd = `"${binaryPath}"`;
      cleanupFiles.push(filePath, binaryPath);
    } else if (lang === "cpp") {
      filename = `program_${uniqueId}.cpp`;
      const binaryName = `program_${uniqueId}.exe`;
      const filePath = path.join(TEMP_DIR, filename);
      const binaryPath = path.join(TEMP_DIR, binaryName);
      fs.writeFileSync(filePath, code);
      compileCmd = `g++ "${filePath}" -o "${binaryPath}"`;
      execCmd = `"${binaryPath}"`;
      cleanupFiles.push(filePath, binaryPath);
    } else if (lang === "java" || lang === "javan") {
      // For Java, we can write a file named Main_${uniqueId}.java and replace the class name in code with Main_${uniqueId}
      const className = `Main_${uniqueId}`;
      filename = `${className}.java`;
      const filePath = path.join(TEMP_DIR, filename);
      
      // Dynamic class name replacement to ensure it compiles properly in separate file
      let modifiedCode = code;
      if (code.includes("public class Main")) {
        modifiedCode = code.replace("public class Main", `public class ${className}`);
      } else if (code.includes("class Main")) {
        modifiedCode = code.replace("class Main", `class ${className}`);
      }
      
      fs.writeFileSync(filePath, modifiedCode);
      compileCmd = `javac --release 17 "${filePath}"`;
      execCmd = `java -cp "${TEMP_DIR}" ${className}`;
      
      cleanupFiles.push(filePath, path.join(TEMP_DIR, `${className}.class`));
    } else {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    let output = "";
    let errorOutput = "";

    try {
      // 1. Compile if required
      if (compileCmd) {
        try {
          await execPromise(compileCmd, { timeout: 8000 });
        } catch (compileErr: any) {
          return NextResponse.json({
            success: false,
            error: "Compilation Error",
            details: compileErr.stderr || compileErr.message,
          });
        }
      }

      // 2. Run the code
      // We will feed the input string to the stdin of the process
      const runPromise = new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const child = exec(execCmd, { timeout: 5000 }, (error, stdout, stderr) => {
          if (error) {
            reject({ error, stdout, stderr });
          } else {
            resolve({ stdout, stderr });
          }
        });

        // Write input to stdin
        if (child.stdin) {
          if (input) {
            child.stdin.write(input);
          }
          child.stdin.end();
        }
      });

      const runResult = await runPromise;
      output = runResult.stdout;
      errorOutput = runResult.stderr;

    } catch (runErr: any) {
      // If compiler commands (like gcc, g++, javac) are missing, ENOENT is raised.
      // Or if there is a runtime exception.
      const isMissingCompiler = runErr.error?.message?.includes("ENOENT") || runErr.error?.code === "ENOENT";
      
      // If compiler is missing, return explicit error instead of simulated execution
      if (isMissingCompiler) {
        return NextResponse.json({
          success: false,
          error: `Compiler for ${language} is not installed on the server.`,
          details: `Please ensure the appropriate compiler/interpreter is available.`
        });
      }

      return NextResponse.json({
        success: false,
        error: "Runtime Error",
        details: runErr.stderr || runErr.error?.message || "Execution timeout or crash.",
      });
    } finally {
      // 3. Clean up files asynchronously
      setTimeout(() => {
        cleanupFiles.forEach((file) => {
          if (fs.existsSync(file)) {
            try {
              fs.unlinkSync(file);
            } catch (cleanupErr) {
              console.error("Cleanup error:", cleanupErr);
            }
          }
        });
      }, 500);
    }

    return NextResponse.json({
      success: true,
      output,
      errorOutput,
    });

  } catch (err: any) {
    console.error("Execute Endpoint Exception:", err);
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}
