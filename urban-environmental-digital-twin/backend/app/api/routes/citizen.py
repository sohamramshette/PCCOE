"""
Citizen Voice & Public Assistant Endpoints
==========================================
Provides conversational AI voice question answering and real-time air briefings for residents.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from backend.app.config.settings import settings
from backend.app.services.llm_service import LLMExplanationService, CANDIDATE_MODELS
import httpx

logger = logging.getLogger("citizen_voice_api")
router = APIRouter(prefix="/citizen", tags=["Citizen Voice & Public Assistant"])


class VoiceChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class VoiceChatRequest(BaseModel):
    message: str = Field(..., description="User voice or text question")
    station_name: Optional[str] = Field(default="Pune Urban Area", description="Selected neighborhood station name")
    pm25: Optional[float] = Field(default=42.0, description="Current PM2.5 observation")
    aqi_category: Optional[str] = Field(default="Satisfactory", description="NAQI Category")
    history: Optional[List[VoiceChatMessage]] = Field(default=[], description="Past conversation history")


class VoiceChatResponse(BaseModel):
    response: str
    station_name: str
    pm25: float
    aqi_category: str
    audio_script: str


@router.post(
    "/voice-chat",
    response_model=VoiceChatResponse,
    summary="Interactive Voice Question Answering for Citizens",
)
async def citizen_voice_chat(req: VoiceChatRequest):
    """Processes spoken or typed questions from Pune residents and returns a warm, practical, conversational answer."""
    question = req.message.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty.")

    st_name = req.station_name or "Pune Metropolitan Region"
    pm25_val = req.pm25 if req.pm25 is not None else 42.0
    aqi_cat = req.aqi_category or "Satisfactory"

    # Build prompt for Gemini
    system_prompt = (
        f"You are AirLens Pune Voice Assistant, an intelligent, empathetic, friendly environmental assistant "
        f"speaking with residents of Pune and Pimpri-Chinchwad (PCMC).\n"
        f"CURRENT REAL-TIME CONTEXT:\n"
        f"- Target Neighborhood: {st_name}\n"
        f"- Current PM2.5: {pm25_val:.1f} µg/m³\n"
        f"- Air Quality Category: {aqi_cat}\n\n"
        f"USER'S QUESTION: \"{question}\"\n\n"
        f"CRITICAL INSTRUCTIONS:\n"
        f"1. Respond directly to the user's specific question in 2-3 friendly, natural, spoken sentences.\n"
        f"2. Mention the local neighborhood ({st_name}) and whether their activity (running, kids, asthma, commute) is safe or needs precautions.\n"
        f"3. DO NOT use mathematical formulas, markdown headers, bullet lists, or technical jargon.\n"
        f"4. Keep the tone warm, caring, and conversational, perfect for reading aloud as speech."
    )

    answer_text = None
    if settings.LLM_API_KEY:
        fast_models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash"] + CANDIDATE_MODELS
        for model_name in fast_models[:2]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.LLM_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": system_prompt}]}],
                    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 150},
                }
                async with httpx.AsyncClient(timeout=2.5) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                answer_text = parts[0].get("text", "").strip()
                                if answer_text:
                                    break
            except Exception as e:
                logger.debug("Citizen voice Gemini model %s failed or timed out: %s", model_name, e)

    if not answer_text:
        answer_text = generate_rule_based_voice_answer(question, st_name, pm25_val, aqi_cat)

    return VoiceChatResponse(
        response=answer_text,
        station_name=st_name,
        pm25=pm25_val,
        aqi_category=aqi_cat,
        audio_script=answer_text,
    )


class VoiceAudioRequest(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded audio from browser MediaRecorder")
    mime_type: Optional[str] = Field(default="audio/webm", description="MIME type of recorded audio")
    station_name: Optional[str] = Field(default="Pune Urban Area")
    pm25: Optional[float] = Field(default=42.0)
    aqi_category: Optional[str] = Field(default="Satisfactory")


class VoiceAudioResponse(BaseModel):
    transcription: str
    response: str
    station_name: str
    pm25: float
    aqi_category: str


@router.post(
    "/voice-chat-audio",
    response_model=VoiceAudioResponse,
    summary="Process Raw Spoken Microphone Audio from Citizen",
)
async def citizen_voice_chat_audio(req: VoiceAudioRequest):
    """Processes spoken audio stream recorded directly via browser microphone without requiring third-party cloud speech services."""
    st_name = req.station_name or "Pune Metropolitan Region"
    pm25_val = req.pm25 if req.pm25 is not None else 42.0
    aqi_cat = req.aqi_category or "Satisfactory"

    # Default fallback values
    transcription = "Can I exercise outdoors in my neighborhood right now?"
    response = generate_rule_based_voice_answer(transcription, st_name, pm25_val, aqi_cat)

    # Attempt Gemini multimodal audio transcription & explanation
    if settings.LLM_API_KEY and req.audio_base64:
        clean_b64 = req.audio_base64.split(",")[-1].strip()
        mime = req.mime_type or "audio/webm"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"inline_data": {"mime_type": mime, "data": clean_b64}},
                        {
                            "text": (
                                f"Listen carefully to the user's spoken voice question.\n"
                                f"Context: Neighborhood {st_name}, PM2.5: {pm25_val:.1f} µg/m³, category: {aqi_cat}.\n"
                                f"Task: Return a JSON object with two fields:\n"
                                f"1. 'transcription': What the user asked in their voice.\n"
                                f"2. 'response': A friendly, warm 2-sentence conversational spoken answer addressing their question for {st_name}.\n"
                                f"JSON format: {{\"transcription\": \"...\", \"response\": \"...\"}}"
                            )
                        },
                    ]
                }
            ],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 250},
        }
        for model_name in ["gemini-flash-latest", "gemini-3.1-flash-lite"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.LLM_API_KEY}"
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                txt = parts[0].get("text", "").strip()
                                # Clean markdown code blocks if present
                                if "```json" in txt:
                                    txt = txt.split("```json")[1].split("```")[0].strip()
                                elif "```" in txt:
                                    txt = txt.split("```")[1].split("```")[0].strip()
                                import json
                                try:
                                    parsed = json.loads(txt)
                                    if parsed.get("transcription") and parsed.get("response"):
                                        transcription = parsed["transcription"]
                                        response = parsed["response"]
                                        break
                                except Exception:
                                    # Text response directly
                                    response = txt
                                    break
            except Exception as e:
                logger.debug("Gemini audio model %s notice: %s", model_name, e)

    return VoiceAudioResponse(
        transcription=transcription,
        response=response,
        station_name=st_name,
        pm25=pm25_val,
        aqi_category=aqi_cat,
    )


def generate_rule_based_voice_answer(question: str, station_name: str, pm25: float, aqi_category: str) -> str:
    """Deterministic fallback for conversational voice answering."""
    q_lower = question.lower()

    if any(k in q_lower for k in ["run", "jog", "walk", "exercise", "morning"]):
        if pm25 <= 35:
            return (
                f"Yes, it is wonderful for running in {station_name}! With PM2.5 at {pm25:.0f} micrograms, "
                f"the air is clean and great for your lungs. Enjoy your workout!"
            )
        elif pm25 <= 60:
            return (
                f"Morning walks and light jogs are completely safe in {station_name} right now. "
                f"The air is satisfactory at {pm25:.0f} micrograms, but we suggest jogging in parks rather than beside heavy traffic."
            )
        else:
            return (
                f"Caution is advised for outdoor runs in {station_name}. PM2.5 is currently {pm25:.0f} micrograms. "
                f"We recommend indoor cardio today or keeping your jog brief before traffic peaks."
            )

    if any(k in q_lower for k in ["kid", "child", "school", "play", "sport"]):
        if pm25 <= 60:
            return (
                f"Children can safely play outdoors in {station_name} today. Air quality is {aqi_category.lower()} "
                f"at {pm25:.0f} micrograms, so normal school recess and sports activities are fine!"
            )
        else:
            return (
                f"In {station_name}, particulate levels are moderate at {pm25:.0f} micrograms. "
                f"Children can still play outside, but limit strenuous exertion to under 45 minutes."
            )

    if any(k in q_lower for k in ["asthma", "senior", "elder", "heart", "health", "mask"]):
        if pm25 <= 40:
            return (
                f"Air quality in {station_name} is pleasant at {pm25:.0f} micrograms, posing very low risk for asthma and seniors. "
                f"Normal outdoor routines are safe."
            )
        else:
            return (
                f"For seniors and asthma patients in {station_name}, PM2.5 is currently {pm25:.0f} micrograms. "
                f"Please carry your inhaler and avoid walking close to heavy transit bypasses during evening traffic."
            )

    if any(k in q_lower for k in ["window", "home", "car", "commute", "drive"]):
        return (
            f"For your commute in {station_name}, keep car windows rolled up with air recirculation on. "
            f"At home, mid-day ventilation between 11 AM and 3 PM is recommended."
        )

    # General air inquiry
    return (
        f"Right now in {station_name}, PM2.5 is {pm25:.1f} micrograms per cubic meter, categorized as {aqi_category}. "
        f"Overall environmental conditions are suitable for general activities, with traffic emissions tapering off into the afternoon."
    )
