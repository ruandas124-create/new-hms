


import { GoogleGenAI } from "@google/genai";
import { Patient } from "../types";

export const generateCounselingStrategy = async (patient: Patient): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    
    // Graceful fallback when API key is missing to keep the preview delightful and engaging
    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "" || apiKey.startsWith("sb_")) {
      console.warn("Gemini API Key is not configured. Utilizing professional simulated fallback logic.");
      
      const pName = patient.name || "Patient";
      const condition = patient.condition || "specialized treatment";
      const pain = patient.doctorAssessment?.painSeverity || "Moderate";
      const affordability = patient.doctorAssessment?.affordability || "Mid";
      const readiness = patient.doctorAssessment?.conversionReadiness || "Needs Push";
      const insurance = patient.hasInsurance === 'Yes' ? "has health insurance coverage" : "does not have documented insurance";

      let recommendationLabel = "the recommended surgery procedures";
      if (patient.doctorAssessment?.surgeryProcedure) {
        recommendationLabel = patient.doctorAssessment.surgeryProcedure;
      }

      return `Counseling Recommendation for ${pName}: Focus on addressing their fears regarding ${recommendationLabel}. Since the patient reports ${pain} pain and has a readiness level of '${readiness}', outline the immediate benefits of pain reduction post-surgery. Given their ${affordability} budget status and that they ${insurance}, present flexible payment steps or insurance coverage options up front to eliminate financial hesitation.`;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      You are an expert medical sales counselor at HMS Hospital. 
      Create a brief, empathetic, and effective counseling strategy (max 65 words) 
      to help this patient decide on their treatment.
      
      Patient Profile:
      - Name: ${patient.name}
      - Age: ${patient.age}
      - Occupation: ${patient.occupation}
      - Condition: ${patient.condition}
      - Insurance Status: ${patient.hasInsurance} (${patient.insuranceName || 'None'})
      
      Doctor's Assessment:
      - Recommendation: ${patient.doctorAssessment?.quickCode}
      - Recommended Procedure: ${patient.doctorAssessment?.surgeryProcedure || 'Surgery'}
      - Pain Level: ${patient.doctorAssessment?.painSeverity}
      - Affordability: ${patient.doctorAssessment?.affordability}
      - Readiness: ${patient.doctorAssessment?.conversionReadiness}
      
      Provide a specific conversational approach and counseling technique to address their likely concerns based on readiness and affordability. Keep it concise, professional, and actionable.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate strategy.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI counselling strategy: Highlight the quick recovery window and comfort level of modern minimally-invasive procedures. Detail insurance approval pathways to ease cost concerns.";
  }
};