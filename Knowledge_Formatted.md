# Research Knowledge Base: Game Matchmaking & Player Psychology

## Category 1 - Dopamine in Games

### Summary/Core Idea
Dopamine is a neurotransmitter that helps your brain understand/interpret goals/rewards.

### Key Concepts

#### Reward Prediction Error (RPE)
RPE is the difference between what you expect and what you get. The brain uses this "error" to update what to chase next. 
- Formula: X = reward + next value - expected value
- Dopamine neurons fire more when outcomes are better than expected & fire less or pause when worse
- They are neutral when the reward is as expected
- **Key Insight:** Surprise will always beat certainty

#### Uncertainty / Variable Rewards
- Games work best when the outcome sits in a "maybe" zone
- Dopamine is most prominently released during times of uncertainty and peaks when the chance of reward is approximately 50%
- That sustained "could happen" keeps your attention locked on it
- Variable-ratio schedules (rewards that arrive after a random number of actions) produce the largest, fastest form of dopamine
- Players will keep using the system because of the uncertainty

#### Practical Application
I was able to show this when I built Grow-A-Beanstalk for our hackathon. The action the player took was fully random, which meant they got significantly more dopamine release and had a higher pull back to the game.

#### Related Concepts
- "Almost wins" work very similarly
- Reward density (subset of VRS) is the average rate at which a player receives a reward/behavior reinforcement over time (depends on type of reward/genre)

### Research Findings

#### Dopamine Pathway Differentiation
1. Your brain can distinguish between different types of dopamine - reward-based vs social interaction dopamine
2. Dopamine earned from rewards travels different neural pathways than dopamine earned through social interaction
3. You can build tolerance to reward-based dopamine and social dopamine separately
4. **Critical Insight:** If you only offer reward-based dopamine initially, then switch to social dopamine, you could completely remove the tolerance to reward-based dopamine and then swap back - this is the solution to games getting boring

#### Types of Dopamine
- Primary dopamine: food/survival related
- Secondary dopamine: social interaction
- These can be distinguished and managed separately

### Sources
- Source 1: Pubmed [Link needed]
- Source 2: [Link needed]
- Source 3: [Link needed]
- Source 4: [Link needed]
- Source 5: [Link needed]

---

## Category 2 - Social Dopamine

### Eisenberger Research

#### Summary
Social dopamine can be released from:
- Positive social interactions (friend praising you)
- Anticipation of good social interaction
- Positive online interactions (garnering likes on YouTube)

### Types of Social Interaction That Release Dopamine
1. Social Praise / Recognition
2. Social Anticipation - Group looking forward to update/activity
3. Social interaction in general - talking with someone in a call
4. Altruistic behavior in a group
5. Group Achievements
6. Sense of belonging
7. Teaching someone else
8. Group Synchronization
9. Social Achievement - Gaining respect, winning challenges

### Stanford Medicine Research

#### Key Finding
Social dopamine (dopamine released from social interaction) does not cause harm. An increase in social dopamine can ONLY result in harm if associated with an already harmful activity.

**Example:** Skipping homework to do something else is already destructive, but the social dopamine itself is not harmful.

### Richard J. Beninger Study

#### Summary
Research on dopamine receptor manipulation in rats:
- Reduced dopamine receptors in one group
- Increased dopamine receptors in another group
- Found that rats with ability to receive more dopamine were more likely to interact socially

---

## Category 3 - Gender Differences in Gaming

### Gender Ratio Effects

#### Summary
Gender plays a role in gaming behavior and optimal matchmaking:

**Men typically:**
- More aggressive and assertive
- Bond better socially through engaging/dramatic experiences
- Better sorted in all-male groups for dramatic experiences

**Women typically:**
- More supportive as a team
- Bond more over soothing experiences
- Better sorted in all-female groups for soothing experiences

**Mixed Groups:**
- If demographic skews one way, spread minority gender across groups
- For balanced demographics, mix groups evenly

### Sources
1. [Gender study link needed]
2. [Gender study link needed]
3. [Gender study link needed]
4. [Gender study link needed]
5. [Gender study link needed]

---

## Category 4 - Emotional Intelligence (EI)

### Summary
EI is important for matchmaking. Framework available at: https://docs.google.com/document/d/1j2Bt2rfe3-PBIk5wmKm9lAZw0I_fsmEwNFTD4qCzI0g/edit?usp=sharing

---

## Category 5 - Rat Park Experiment

### Summary
One of the most influential studies on isolation and addiction:
- Rats in isolation with choice between heroin water and normal water all drank themselves to death
- Rats in "park" where they could socialize almost all avoided heroin water
- Heroin-addicted rats put into rat park became unaddicted

### Key Insight
Isolation causes addiction that makes rats kill themselves. Social interaction prevents and can reverse addiction. This has profound implications for social gaming as a solution to modern isolation.

### Source
https://www.ukat.co.uk/blog/medicine/what-can-the-rat-park-experiment-teach-us-about-addiction/

---

## Category 6 - Continuous Engagement

### Off-Platform Communication

#### Key Finding
78% of lasting gaming friendships (persisting over 1 year) involved regular communication through channels outside of the game environment (Discord, WhatsApp, in-person meetings).

### Source
https://www.psychologyofgames.com/research/virtual-relationships-2023

---

## Category 7 - Pitch Tracking for Emotional Detection

### Summary
Pitch tracking can detect emotional states with little computational cost:

#### Emotional Indicators
- **Rudeness/Anger/Discontent:** Low pitch (below average)
- **Happiness:** High pitch (above average)
- **Toxicity:** Jagged spikes in pitch
- **Laughter:** Smooth spikes in pitch

#### Technical Details
- Most emotion happens between 2.5-4kHz and 0-250Hz
- Natural voice vibration: ~130 times/second
- Angry voice vibration: ~336 times/second
- Minimum sampling rate: 8000 measurements/second (more is better)
- Varies by region/culture

---

## Category 8 - Interest Sorting

### Summary
Interest matters but context is key:
- Interest has slight effect on bonding ability
- In-game shared experience often sufficient for bonding
- Interest sorting more important for initial connection than sustained engagement

### Source
https://carta.anthropogeny.org/moca/topics/joint-attention

---

## Category 9 - Gaming Session Optimization

### Algorithm Planning
https://docs.google.com/document/d/1cfS3ZUAsevNDR2VaAiU1k-CqPh9yhwifyHKQzUOBV-U/edit?usp=sharing

### Optimal Gaming Patterns

#### Session Duration
- Social interaction peaks at 45-60 minutes of continuous play
- After peak, brain reduces receptor sensitivity
- Prefrontal cortex experiences decreased glucose utilization
- Social processing networks become less responsive (similar to muscle fatigue)

#### Recovery Strategies
- 5-10 minute breaks after 45-60 minutes can reset the curve
- Alternate between high-coordination and low-intensity activities
- Monitor performance metrics to determine fatigue

#### Game-Specific Requirements
- Action/Shooter games: 15-minute cooldown per 75 minutes played
- YouTube's break reminders based on similar research

#### Tolerance Patterns
- Social-based dopamine tolerance: 6-8 weeks
- Reward-based dopamine tolerance: 2-3 weeks
- 3% daily increase in social intensity yields:
  - 29% higher 30-day retention
  - 41% lower social anxiety markers
- 96-hour break restores 78% of tonic baseline (22% deficit from normal)

---

## Category 10 - Gender-Specific Addiction Patterns

### Male Patterns
- More susceptible to gaming addiction
- Higher reward center activation
- Rapid, intense dopamine spikes
- More dopamine neurons in substantia nigra (motor control/reward processing)
- More responsive to immediate intense rewards

### Female Patterns
- Better executive control
- Different reward processing patterns
- More sustained, less intensive dopamine responses
- More dopamine neurons in VTA (influences controlled responses)
- If addicted, may experience worse functional impairment

### Effects on Children
1. Increased vulnerability to reward-based behaviors
2. Easier habit formation
3. Women in early life more susceptible to negative effects (e.g., lootbox exposure → gambling addiction risk)

---

## Category 11 - Cognitive Adaptations

### Brain Filtering
After excessive gaming, brain filters unnecessary stimuli (chat messages, GUI features, shop ads)
- **Implication:** Less is more, quality over quantity in UI design

### Game Type Effects
Different games affect cognitive function differently:
- High-action intense games can increase aggression

### Social Interaction Benefits
- Increases social interaction by factor of 0.13-0.72 (or 0.2-0.5 depending on study)
- Varies significantly by game type

### Consistency Matters
Morning vs night gaming affects match quality:
- Consistency more important than specific timing
- Maintains engagement without decreasing social dopamine receptor responsiveness

---

## Category 12 - Behavioral Prediction

### Dopamine Release Correlation
Can predict dopamine release through:
- Social interaction frequency
- Retry rates on challenges
- Return frequency to game
- Session duration

### Important Caveats
- Correlation is not causation
- Long sessions might indicate free time, not just engagement
- Individual differences significant (social vs achievement motivation)
- Dopamine neuron firing increases with reward cues even without actual reward

### Behavioral Economics
- People prefer uncertainty
- Overvalue rare wins
- Discount future rewards
- Achievements needed early, MUST switch to social goals for retention

---

## Category 13 - Social vs Competitive Dynamics

### Cooperative vs Competitive
- **Cooperative:** More sustained dopamine release, better for long-term engagement
- **Competitive:** Intense spikes, can be gradual with anticipation of "getting better"

### Sleep Impact
- Good sleep → better dopamine receptor sensitivity
- Poor sleep → more irritation/frustration in games
- Incentivizing late-night play is counterproductive
- High sleep amounts → emotional stability
- Poor sleep → increased stress response

---

## Category 14 - Oxytocin System

### Summary/Core Idea
Oxytocin is a neuropeptide that determines how much you care about social outcomes (approval, belonging, trust). It acts as a signaling agent rather than causing behavior directly.

### Key Characteristics
- Cannot be directly measured in human brain (current tech limitation)
- Synthesized in hypothalamus
- Released in bloodstream AND directly into brain
- Targets: amygdala, ventral striatum, prefrontal cortex
- Varies between genders

### Functions
1. Facilitates learning of social rewards/punishments
2. Increases attention to social cues
3. Amplifies social motivations (bonding, cooperation, or defense/exclusion)

### Oxytocin-Dopamine Interaction
- Systems are interlocked in social learning
- Social reinforcement (trust, inclusion, praise) activates nucleus accumbens and VTA
- Oxytocin flags social moments as valuable
- Dopamine handles learning from those interactions
- Both required for bonding (blocking either prevents pair bonds)

### Biological Basis

#### Production Sites
- **Paraventricular nucleus (PVN)**
- **Supraoptic nucleus (SON)**

#### Distribution Pathways
1. **Bloodstream:** For major events (childbirth, stress responses)
   - Lowers stress hormones after hugging
   - Adjusts heart rate
   - Signals "socially meaningful event happening"

2. **Direct brain signaling:** For motivation and reward
   - Example: Team victory → oxytocin to VTA → amplifies dopamine
   - Critical for long-term motivation

### Brain Target Regions

#### Amygdala (Threat Detector)
- Oxytocin "turns down" threat reception
- Increases cooperation willingness
- Reduces paranoia in multiplayer

#### Ventral Striatum/Nucleus Accumbens (Reward Hub)
- Makes social success feel as rewarding as loot boxes
- Why playing with friends feels more rewarding

#### Prefrontal Cortex
- Increases tendency to value relationships over short-term rewards
- Affects risk assessment and impulse control

#### Hippocampus (Memory Hub)
- Strengthens social memories
- Makes games more memorable when played socially

### Altruistic Behavior
- Single biggest cause of social-based dopamine release
- Correlates with social bond quality
- Better friends → more altruism
- Algorithm increases altruism → higher retention (long-term effect)
- Creates oxytocin-dopamine imbalance → natural adaptation toward altruism
- Improves overall community quality

### Important Limitations
- Oxytocin ≠ just "love hormone" (oversimplification)
- Not just social bonding chemical
- Acts as hormone AND neurochemical signal
- Cannot be "cranked like a lever" like dopamine
- Requires contextual social scenarios
- Blood oxytocin ≠ brain oxytocin (not always in sync)

### Multiplayer Addiction Mechanism
- Different from single-player reward-centric games
- Oxytocin boosts relationship value over short-term outcomes
- Study: People given oxytocin keep investing in others after betrayal
- Creates different, more sustainable addiction pattern

---
