import { supabase } from "../config/supabase.client.js";
import { ENV } from "../config/env.config.js";

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
 * Transform problem description to story-type using Gemini API
 */
export const transformProblemDescription = async (req, res) => {
  try {
    if (!ENV.GEMINI_API_KEY) {
      return res.status(400).json({ error: "Gemini API key not configured" });
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

    // Call Gemini API to transform the description
    const prompt = `Transform this problem description into a story-type format. Keep all technical details, constraints, and requirements exactly the same. Make it more engaging and narrative-driven:\n\n${problemData.description}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error("Gemini API error:", errorData);
      return res.status(500).json({ error: "Failed to transform description with Gemini" });
    }

    const geminiData = await geminiResponse.json();
    const transformedDescription = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!transformedDescription) {
      return res.status(500).json({ error: "No response from Gemini API" });
    }

    // Update the interview_problem with gemini_description
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
    console.error("Error transforming problem description:", err);
    res.status(500).json({ error: "Failed to transform problem description" });
  }
};
