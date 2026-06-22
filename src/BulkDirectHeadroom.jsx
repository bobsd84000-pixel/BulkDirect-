import React, { useState, useRef, useEffect } from 'react';

export default function BulkDirectHeadroom() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'BulkDirect headroom chat initialized. 4-agent pipeline ready.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0, cached: 0 });
  const [agentStatus, setAgentStatus] = useState({
    planificateur: 'idle',
    executeur: 'idle',
    ingenieur: 'idle',
    qa: 'idle'
  });
  const chatEndRef = useRef(null);
  const cachedContextRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const compressPrompt = (text) => {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s#@]/g, '')
      .slice(0, 120);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    if (!cachedContextRef.current) {
      cachedContextRef.current = {
        type: "text",
        text: `You are BulkDirect 4-agent orchestrator (Planificateur → Exécuteur Reddit → Ingénieur Pipeline → QA).
Project: icpdgjzlmdculnrxmjiy | Tables: crm_leads, crm_deals, crm_interactions
Agents: {
  Planificateur: Analyzes Reddit opportunities, scores relevance (0-100)
  Exécuteur: Executes Reddit scraping, deduplicates, posts to Supabase
  Ingénieur: RAG pipeline (pgvector+
