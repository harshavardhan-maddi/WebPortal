import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

// Path for temporary file execution inside workspace
const TEMP_DIR = path.join(process.cwd(), "temp_submissions");

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const { commands, language } = await req.json();
    if (!commands || !Array.isArray(commands)) {
      return NextResponse.json({ error: "commands must be an array of strings" }, { status: 400 });
    }

    if (language?.toLowerCase() !== "python") {
      return NextResponse.json({ error: "Only python is supported in interactive mode" }, { status: 400 });
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const runnerPath = path.join(TEMP_DIR, `runner_${uniqueId}.py`);

    // The runner Python script reads commands as a JSON list from stdin.
    // It executes each statement using the same globals dictionary.
    // For the last command, it tries to compile it as an expression (eval)
    // so it will automatically print its value, simulating a REPL.
    // It redirects stdout and stderr to capture print outputs and exception messages.
    const runnerCode = `
import sys
import io
import json

def run_code():
    try:
        commands = json.loads(sys.stdin.read())
    except Exception as e:
        print("Invalid input JSON")
        return
    
    globals_dict = {}
    
    # Pre-import math and sys for user convenience
    try:
        exec("import math, sys, os", globals_dict)
    except Exception:
        pass
    
    for i, cmd in enumerate(commands):
        is_last = (i == len(commands) - 1)
        if not cmd.strip():
            continue
        
        stdout_capture = io.StringIO()
        sys.stdout = stdout_capture
        sys.stderr = stdout_capture
        
        try:
            if is_last:
                try:
                    # Try compiling as eval first (expressions)
                    node = compile(cmd, "<string>", "eval")
                    result = eval(node, globals_dict)
                    sys.stdout = sys.__stdout__
                    sys.stderr = sys.__stderr__
                    output = stdout_capture.getvalue()
                    if result is not None:
                        if output:
                            print(output.rstrip() + "\\n" + repr(result))
                        else:
                            print(repr(result))
                    else:
                        print(output.rstrip())
                except Exception:
                    # Fallback to exec for statements (assignments, def, import, etc.)
                    exec(cmd, globals_dict)
                    sys.stdout = sys.__stdout__
                    sys.stderr = sys.__stderr__
                    output = stdout_capture.getvalue()
                    print(output.rstrip())
            else:
                # Run previous commands to build state
                exec(cmd, globals_dict)
        except Exception as e:
            sys.stdout = sys.__stdout__
            sys.stderr = sys.__stderr__
            if is_last:
                print(f"Error: {e}")
            else:
                print(f"Error in command {i+1}: {e}")
                break

run_code()
`;

    fs.writeFileSync(runnerPath, runnerCode.trim());

    // Execute the runner python script passing commands in stdin
    const child = exec(`python "${runnerPath}"`, { timeout: 8000 });
    
    const runPromise = new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (data) => { stdout += data; });
      child.stderr?.on("data", (data) => { stderr += data; });
      
      child.on("close", (code) => {
        resolve({ stdout, stderr });
      });
      child.on("error", (err) => {
        reject(err);
      });
    });

    if (child.stdin) {
      child.stdin.write(JSON.stringify(commands));
      child.stdin.end();
    }

    const { stdout, stderr } = await runPromise;

    // cleanup runner script
    setTimeout(() => {
      if (fs.existsSync(runnerPath)) {
        try {
          fs.unlinkSync(runnerPath);
        } catch (cleanupErr) {
          console.error("Cleanup error in interactive:", cleanupErr);
        }
      }
    }, 500);

    return NextResponse.json({
      success: true,
      output: (stdout || stderr || "").trim(),
    });

  } catch (err: any) {
    console.error("Interactive API error:", err);
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}
