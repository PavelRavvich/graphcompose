export class QuorumCancelledError extends Error {
  constructor() {
    super("Quorum reached by parallel branch; execution cancelled.");
    this.name = "QuorumCancelledError";
  }
}

export interface BranchCancelToken {
  cancelled: boolean;
}

export class QuorumManager {
  private activeQuorums = new Map<string, {
    min: number;
    votes: number;
    tokens: Set<BranchCancelToken>;
  }>();

  registerBranch(quorumId: string, min: number, token: BranchCancelToken) {
    if (!this.activeQuorums.has(quorumId)) {
      this.activeQuorums.set(quorumId, { min, votes: 0, tokens: new Set() });
    }
    const quorum = this.activeQuorums.get(quorumId)!;
    quorum.tokens.add(token);
    
    // If quorum is already met, immediately cancel this new branch
    if (quorum.votes >= quorum.min) {
      token.cancelled = true;
    }
  }

  isQuorumMet(quorumId: string): boolean {
    const quorum = this.activeQuorums.get(quorumId);
    return quorum ? quorum.votes >= quorum.min : false;
  }

  addVote(quorumId: string): boolean {
    const quorum = this.activeQuorums.get(quorumId);
    if (!quorum) return false;
    
    quorum.votes++;
    if (quorum.votes >= quorum.min) {
      // Cancel all branches in this quorum
      for (const token of quorum.tokens) {
        token.cancelled = true;
      }
      return true; // Met
    }
    return false; // Not met
  }
}
