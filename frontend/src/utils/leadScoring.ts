export type LeadBucket = 'Hot' | 'Warm' | 'Average' | 'Cold';

export interface ScoringResult {
  score: number;
  bucket: LeadBucket;
  reasons: string[];
}

export const mapScoreToBucket = (score: number): LeadBucket => {
  if (score >= 81) return 'Hot';
  if (score >= 61) return 'Warm';
  if (score >= 31) return 'Average';
  return 'Cold';
};

export const computeLeadScore = (lead: any): ScoringResult => {
  let score = 0;
  const reasons: string[] = [];

  // 1. Base by lead stage
  const stage = (lead['lead stage'] || '').toLowerCase();
  if (stage === 'hot') {
    score += 35;
    reasons.push('Base: Hot stage (+35)');
  } else if (stage === 'warm') {
    score += 25;
    reasons.push('Base: Warm stage (+25)');
  } else if (stage === 'cold') {
    score += 10;
    reasons.push('Base: Cold stage (+10)');
  } else {
    score += 15;
    reasons.push('Base: Neutral stage (+15)');
  }

  // 2. Intent keywords in concern/summary
  const text = `${lead.concern || ''} ${lead['Conversation Summary'] || ''}`.toLowerCase();
  if (/price|quote|cost|rate/i.test(text)) {
    score += 15;
    reasons.push('Intent: Pricing/Quote inquiry (+15)');
  }
  if (/capacity|tph|ton|output/i.test(text)) {
    score += 12;
    reasons.push('Intent: Capacity/TPH details (+12)');
  }
  if (/delivery|dispatch|ship|transport/i.test(text)) {
    score += 10;
    reasons.push('Intent: Delivery/Logistics (+10)');
  }
  if (/urgent|asap|immediately|quick/i.test(text)) {
    score += 12;
    reasons.push('Intent: High Urgency (+12)');
  }

  // 3. Completeness (Inferred from text for now as fields aren't explicit)
  // Logic: +8 if state present, +8 if district present, +18 if capacity_tph present
  // For the sake of v1, we check if these entities are mentioned in the summary or concern
  const hasState = /state|location|in\s+[A-Z][a-z]+/i.test(text); // Very basic check
  const hasCapacity = /\d+\s*tph|capacity/i.test(text);

  if (hasState) {
    score += 8;
    reasons.push('Data: Location identified (+8)');
  } else {
    score -= 8;
    reasons.push('Missing: State/Location (-8)');
  }

  if (hasCapacity) {
    score += 18;
    reasons.push('Data: Capacity requirement clear (+18)');
  } else {
    score -= 15;
    reasons.push('Missing: Capacity requirement (-15)');
  }

  // 4. Sentiment
  const sentiment = (lead.sentiment || '').toLowerCase();
  if (sentiment.includes('pos')) {
    score += 6;
    reasons.push('Sentiment: Positive (+6)');
  } else if (sentiment.includes('neg')) {
    score -= 10;
    reasons.push('Sentiment: Negative (-10)');
  }

  // Final Clamp
  const finalScore = Math.max(0, Math.min(100, score));
  
  return {
    score: finalScore,
    bucket: mapScoreToBucket(finalScore),
    reasons
  };
};
