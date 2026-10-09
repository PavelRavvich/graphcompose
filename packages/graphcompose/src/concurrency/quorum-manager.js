export class QuorumCancelledError extends Error {
  constructor() {
    super("Quorum reached by parallel branch; execution cancelled.");
    this.name = "QuorumCancelledError";
  }
}
export class QuorumManager {
  activeQuorums = new Map();
  registerBranch(quorumId, min, token, max, timeoutSeconds) {
    if (!this.activeQuorums.has(quorumId)) {
      const q = {
        min,
        max: max ?? min,
        votes: 0,
        finished: 0,
        tokens: new Set(),
      };
      if (timeoutSeconds) {
        q.timer = setTimeout(() => {
          this.cancelAll(q);
        }, timeoutSeconds * 1000);
      }
      this.activeQuorums.set(quorumId, q);
    }
    const quorum = this.activeQuorums.get(quorumId);
    quorum.tokens.add(token);
    if (quorum.votes >= quorum.max) {
      token.cancelled = true;
    }
  }
  isQuorumMet(quorumId) {
    const quorum = this.activeQuorums.get(quorumId);
    return quorum ? quorum.votes >= quorum.min : false;
  }
  addVote(quorumId, isValid) {
    const quorum = this.activeQuorums.get(quorumId);
    if (!quorum) return false;
    quorum.finished++;
    if (isValid) quorum.votes++;
    // Condition 1: Reached Max
    if (quorum.votes >= quorum.max) {
      this.cancelAll(quorum);
      return true;
    }
    // Condition 2: Fail Fast (impossible to reach min)
    const failed = quorum.finished - quorum.votes;
    if (failed > quorum.tokens.size - quorum.min) {
      this.cancelAll(quorum);
      return false;
    }
    // Condition 3: All finished naturally
    if (quorum.finished === quorum.tokens.size) {
      this.cancelAll(quorum);
    }
    return quorum.votes >= quorum.min;
  }
  cancelAll(quorum) {
    if (quorum.timer) clearTimeout(quorum.timer);
    for (const token of quorum.tokens) {
      token.cancelled = true;
    }
  }
}
