export interface TestRankImpact {
  quizId: string;
  creditsEarned: number;
  totalCreditsBefore: number;
  totalCreditsAfter: number;
  rankBefore: number;
  rankAfter: number;
  rankChange: number; // positive = improved (closer to 1), negative = declined
}

export function calculateRankProgression(
  allStudents: { roll_number: string; name: string; domain?: string }[],
  allResults: { id: string; quiz_id: string; roll_number: string; correct: number; timestamp: string; score?: number }[],
  quizzes: { id: string; date: string; time: string }[]
): Record<string, Record<string, TestRankImpact>> {
  // Filter out invalid results (e.g. active sessions or temporary entries)
  const validResults = allResults.filter(r => r.score !== undefined && r.score !== -1 && r.score !== -2);

  // Sort quizzes chronologically
  const sortedQuizzes = [...quizzes].sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time || '00:00:00'}`).getTime();
    const timeB = new Date(`${b.date}T${b.time || '00:00:00'}`).getTime();
    return timeA - timeB;
  });

  // Map quizId to its chronological index
  const quizIndices = new Map(sortedQuizzes.map((q, idx) => [q.id, idx]));

  // For each student, keep track of their credits after each quiz
  const studentsCreditsAtStep: Record<string, number[]> = {};
  allStudents.forEach(s => {
    studentsCreditsAtStep[s.roll_number] = new Array(sortedQuizzes.length).fill(0);
  });

  // Populate results
  validResults.forEach(r => {
    const qIdx = quizIndices.get(r.quiz_id);
    if (qIdx !== undefined && studentsCreditsAtStep[r.roll_number]) {
      studentsCreditsAtStep[r.roll_number][qIdx] = r.correct || 0;
    }
  });

  // Calculate cumulative credits at each step
  const studentsCumulativeCredits: Record<string, number[]> = {};
  allStudents.forEach(s => {
    let sum = 0;
    studentsCumulativeCredits[s.roll_number] = sortedQuizzes.map((q, idx) => {
      sum += studentsCreditsAtStep[s.roll_number][idx];
      return sum;
    });
  });

  // Calculate ranks at each step
  const ranksAtStep: Record<string, number[]> = {};
  allStudents.forEach(s => {
    ranksAtStep[s.roll_number] = new Array(sortedQuizzes.length).fill(1);
  });

  // At each step, sort students to determine rank
  for (let step = 0; step < sortedQuizzes.length; step++) {
    const studentsWithCredits = allStudents.map(s => ({
      roll_number: s.roll_number,
      credits: studentsCumulativeCredits[s.roll_number][step]
    }));
    // Sort descending by credits
    studentsWithCredits.sort((a, b) => b.credits - a.credits);

    // Assign ranks, handling ties
    let currentRank = 1;
    for (let i = 0; i < studentsWithCredits.length; i++) {
      if (i > 0 && studentsWithCredits[i].credits < studentsWithCredits[i - 1].credits) {
        currentRank = i + 1;
      }
      const studentRoll = studentsWithCredits[i].roll_number;
      ranksAtStep[studentRoll][step] = currentRank;
    }
  }

  // Calculate rank impact for each student and quiz
  const impactMap: Record<string, Record<string, TestRankImpact>> = {};
  allStudents.forEach(s => {
    impactMap[s.roll_number] = {};
    const defaultRank = allStudents.length; // start at the bottom

    sortedQuizzes.forEach((q, step) => {
      const creditsEarned = studentsCreditsAtStep[s.roll_number][step];
      const totalCreditsAfter = studentsCumulativeCredits[s.roll_number][step];
      const rankAfter = ranksAtStep[s.roll_number][step];

      const rankBefore = step === 0 ? defaultRank : ranksAtStep[s.roll_number][step - 1];
      const totalCreditsBefore = step === 0 ? 0 : studentsCumulativeCredits[s.roll_number][step - 1];

      // Note: if rank number decreases, performance improved (e.g. 10 -> 8 is +2 improvement)
      const rankChange = rankBefore - rankAfter;

      impactMap[s.roll_number][q.id] = {
        quizId: q.id,
        creditsEarned,
        totalCreditsBefore,
        totalCreditsAfter,
        rankBefore,
        rankAfter,
        rankChange
      };
    });
  });

  return impactMap;
}

export function getQuestionTopic(questionText: string, domain: string): string {
  const text = (questionText || "").toLowerCase();
  const d = (domain || "").toLowerCase();

  if (d.includes("cyber")) {
    if (text.includes("sql") || text.includes("injection") || text.includes("xss") || text.includes("csrf") || text.includes("owasp") || text.includes("exploit") || text.includes("vulnerability")) {
      return "Web Application Security";
    }
    if (text.includes("encrypt") || text.includes("decrypt") || text.includes("rsa") || text.includes("aes") || text.includes("cipher") || text.includes("cryptography") || text.includes("hash") || text.includes("key")) {
      return "Cryptography";
    }
    if (text.includes("phish") || text.includes("malware") || text.includes("trojan") || text.includes("virus") || text.includes("threat") || text.includes("ransomware")) {
      return "Threats & Vulnerabilities";
    }
    if (text.includes("network") || text.includes("ip") || text.includes("port") || text.includes("firewall") || text.includes("protocol") || text.includes("subnet") || text.includes("dns")) {
      return "Network Security";
    }
    return "Security Principles";
  }

  if (d.includes("fsd") || d.includes("full") || d.includes("web")) {
    if (text.includes("react") || text.includes("state") || text.includes("hook") || text.includes("component") || text.includes("props") || text.includes("effect") || text.includes("virtual dom")) {
      return "ReactJS Component Architecture";
    }
    if (text.includes("css") || text.includes("html") || text.includes("style") || text.includes("flexbox") || text.includes("grid") || text.includes("tailwind") || text.includes("responsive")) {
      return "UI Styling & Layout";
    }
    if (text.includes("node") || text.includes("express") || text.includes("api") || text.includes("server") || text.includes("middleware") || text.includes("http") || text.includes("backend")) {
      return "Backend & API Development";
    }
    if (text.includes("sql") || text.includes("mongo") || text.includes("db") || text.includes("query") || text.includes("table") || text.includes("schema") || text.includes("database")) {
      return "Databases & Storage";
    }
    return "Javascript Core Development";
  }

  if (d.includes("aiml") || d.includes("ai") || d.includes("ml") || d.includes("machine")) {
    if (text.includes("neural") || text.includes("deep") || text.includes("cnn") || text.includes("rnn") || text.includes("layer") || text.includes("pytorch") || text.includes("tensorflow") || text.includes("activation")) {
      return "Deep Learning & Neural Nets";
    }
    if (text.includes("supervised") || text.includes("unsupervised") || text.includes("regression") || text.includes("svm") || text.includes("tree") || text.includes("classification") || text.includes("cluster")) {
      return "Classical Machine Learning";
    }
    if (text.includes("python") || text.includes("numpy") || text.includes("pandas") || text.includes("matplotlib") || text.includes("dataframe")) {
      return "Data Manipulation & Tooling";
    }
    if (text.includes("gradient") || text.includes("loss") || text.includes("optimizer") || text.includes("backprop") || text.includes("convex") || text.includes("learning rate")) {
      return "Optimization & Math";
    }
    return "AI Core Fundamentals";
  }

  if (d.includes("data") || d.includes("science")) {
    if (text.includes("mean") || text.includes("median") || text.includes("std") || text.includes("deviation") || text.includes("probability") || text.includes("distribution") || text.includes("hypothesis") || text.includes("p-value")) {
      return "Statistics & Probability";
    }
    if (text.includes("sql") || text.includes("query") || text.includes("join") || text.includes("group by") || text.includes("select") || text.includes("database")) {
      return "SQL & Data Extraction";
    }
    if (text.includes("visualization") || text.includes("plot") || text.includes("chart") || text.includes("matplotlib") || text.includes("seaborn") || text.includes("scatter") || text.includes("histogram")) {
      return "Data Visualization";
    }
    if (text.includes("clean") || text.includes("missing") || text.includes("impute") || text.includes("outlier") || text.includes("null") || text.includes("preprocess")) {
      return "Data Preprocessing";
    }
    return "Data Analytics Fundamentals";
  }

  return "General Tech Aptitude";
}

export function generateDeterministicStudentAnswers(
  rollNumber: string,
  quizId: string,
  questions: any[],
  correctCount: number
): { questionIdx: number; studentSelected: number[]; isCorrect: boolean }[] {
  // Simple hash function for seeding
  const seedString = `${rollNumber}_${quizId}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }

  const indices = Array.from({ length: questions.length }, (_, i) => i);
  
  let seed = Math.abs(hash) || 1;
  const nextRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Fisher-Yates Shuffle with deterministic seed
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }

  const boundedCorrectCount = Math.min(Math.max(0, correctCount), questions.length);
  const correctIndicesSet = new Set(indices.slice(0, boundedCorrectCount));

  return questions.map((q, idx) => {
    const isCorrect = correctIndicesSet.has(idx);
    const correctAnswer = q.correctAnswer !== undefined ? q.correctAnswer : 0;
    
    let studentSelected: number[] = [];
    if (isCorrect) {
      studentSelected = [correctAnswer];
    } else {
      const optionsCount = q.options?.length || 4;
      const incorrectOptions: number[] = [];
      for (let o = 0; o < optionsCount; o++) {
        if (o !== correctAnswer) {
          incorrectOptions.push(o);
        }
      }
      const incorrectIdx = incorrectOptions.length > 0 
        ? incorrectOptions[Math.floor(nextRandom() * incorrectOptions.length)]
        : (correctAnswer + 1) % optionsCount;
      studentSelected = [incorrectIdx];
    }

    return {
      questionIdx: idx,
      studentSelected,
      isCorrect
    };
  });
}
