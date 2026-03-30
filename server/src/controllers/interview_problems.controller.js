import { supabase } from "../config/supabase.client.js";
import { ENV } from "../config/env.config.js";
import { callGroqLLM } from "../config/groq.client.js";

/**
 * Get interview problems by interview ID
 */
export const getInterviewProblems = async (req, res) => {
  try {
    const { interviewId } = req.params;

    const { data, error } = await supabase
      .from("interview_problems")
      .select("*")
      .eq("interview_id", interviewId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Interview problem not found" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("Error fetching interview problems:", err);
    res.status(500).json({ error: "Failed to fetch interview problems" });
  }
};

/**
 * Create interview problem from a problem
 */
export const createInterviewProblem = async (req, res) => {
  try {
    const { interviewId, problemId } = req.body;

    // Fetch the problem to snapshot
    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("*")
      .eq("id", problemId)
      .single();

    if (problemError) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Create interview_problem record
    const { data, error } = await supabase
      .from("interview_problems")
      .insert({
        interview_id: interviewId,
        problem_id: problemId,
        title: problem.title,
        description: problem.description,
        input_format: problem.input_format,
        output_format: problem.output_format,
        constraints: problem.constraints,
        hints: problem.hints,
        difficulty: problem.difficulty,
        time_limit_ms: problem.time_limit_ms,
        memory_limit_mb: problem.memory_limit_mb,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("Error creating interview problem:", err);
    res.status(500).json({ error: "Failed to create interview problem" });
  }
};

/**
 * Update interview problem (gemini_description, etc.)
 */
export const updateInterviewProblem = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { gemini_description, ...updates } = req.body;

    const { data, error } = await supabase
      .from("interview_problems")
      .update({
        ...updates,
        ...(gemini_description && { gemini_description }),
      })
      .eq("interview_id", interviewId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("Error updating interview problem:", err);
    res.status(500).json({ error: "Failed to update interview problem" });
  }
};

/**
 * Transform problem description to story-type using Groq LLM
 */
export const transformProblemDescription = async (req, res) => {
  try {
    if (!ENV.GROQ_API_KEY) {
      return res.status(400).json({ error: "Groq API key not configured" });
    }

    const { interviewId } = req.params;

    // Fetch the interview problem
    const { data: problemData, error: fetchError } = await supabase
      .from("interview_problems")
      .select("*")
      .eq("interview_id", interviewId)
      .single();

    if (fetchError || !problemData) {
      return res.status(404).json({ error: "Interview problem not found" });
    }

    if (!problemData.description) {
      return res.status(400).json({ error: "Problem has no description to transform" });
    }

    // Skip if already transformed
    if (problemData.gemini_description) {
      return res.json({
        success: true,
        message: "Problem already transformed",
        gemini_description: problemData.gemini_description,
        problem: problemData,
      });
    }

    // Call Groq LLM to transform the description
    const prompt = `Make this Problem Description story-like and engaging while keeping all details, HTML Structure and katex tags intact.\n
    You can use characters Alice and/or Bob only if needed, to make it more engaging story.\n

    Original Problem Description:\n\n${problemData.description}. 
    
    \nNo HTML tags should be changed.
    \nKeep complex tags like <pre>, <code>, <katex> intact without any modifications. Just make their inner text content more story-like and engaging.
    \nJust make changes to the inner text, and STRICTLY keep all formatting, details and tags intact(unchanged).`;

    console.log("[Interview] Calling Groq LLM to transform problem description");
    const transformedDescription = await callGroqLLM(prompt, {
      model: "openai/gpt-oss-120b",
      temperature: 0.7,
      maxTokens: 2048,
    });

    if (!transformedDescription) {
      return res.status(500).json({ error: "No response from Groq API" });
    }

    // Update the interview_problem with transformed description
    const { data: updatedProblem, error: updateError } = await supabase
      .from("interview_problems")
      .update({
        gemini_description: transformedDescription,
      })
      .eq("interview_id", interviewId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: "Problem description transformed successfully",
      gemini_description: transformedDescription,
      problem: updatedProblem,
    });
  } catch (err) {
    console.error("[Interview] Error transforming problem description:", err);
    res.status(500).json({ error: "Failed to transform problem description" });
  }
};
