/**
 * Provider Queue
 * Manages lead queues per provider with load balancing
 */

class ProviderQueue {
  constructor(providerId, maxConcurrent = 10) {
    this.providerId = providerId;
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.processing = new Set();
    this.completed = [];
    this.failed = [];
    this.createdAt = new Date();
  }

  /**
   * Add lead to queue
   */
  enqueue(lead, priority = 'normal') {
    const item = {
      leadId: lead.postId || lead.id,
      lead,
      priority,
      status: 'queued',
      enqueuedAt: new Date(),
      processedAt: null,
      error: null,
      attempts: 0
    };

    // Insert based on priority
    if (priority === 'high') {
      this.queue.unshift(item);
    } else if (priority === 'low') {
      this.queue.push(item);
    } else {
      // normal: insert after high priority items
      const highPriorityCount = this.queue.filter(i => i.priority === 'high').length;
      this.queue.splice(highPriorityCount, 0, item);
    }

    return item;
  }

  /**
   * Dequeue next item for processing
   */
  dequeue() {
    if (this.queue.length === 0) {
      return null;
    }

    if (this.processing.size >= this.maxConcurrent) {
      return null; // At capacity
    }

    const item = this.queue.shift();
    this.processing.add(item.leadId);
    item.status = 'processing';

    return item;
  }

  /**
   * Mark item as processed
   */
  markProcessed(leadId, result = null) {
    this.processing.delete(leadId);

    const item = this.findItem(leadId);
    if (item) {
      item.status = 'sent';
      item.processedAt = new Date();
      item.result = result;
      this.completed.push(item);
      return item;
    }

    return null;
  }

  /**
   * Mark item as failed
   */
  markFailed(leadId, error, retry = true) {
    this.processing.delete(leadId);

    const item = this.findItem(leadId);
    if (item) {
      item.attempts++;
      item.error = error;

      if (retry && item.attempts < 3) {
        // Re-queue for retry
        item.status = 'queued';
        this.queue.push(item);
      } else {
        // Give up
        item.status = 'failed';
        this.failed.push(item);
      }

      return item;
    }

    return null;
  }

  /**
   * Find item in queue or processing
   */
  findItem(leadId) {
    // Check queue
    let item = this.queue.find(i => i.leadId === leadId);
    if (item) return item;

    // Check processing
    for (const completedItem of this.completed) {
      if (completedItem.leadId === leadId) return completedItem;
    }

    for (const failedItem of this.failed) {
      if (failedItem.leadId === leadId) return failedItem;
    }

    return null;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      providerId: this.providerId,
      queueLength: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      completed: this.completed.length,
      failed: this.failed.length,
      utilizationRate: this.processing.size / this.maxConcurrent,
      isAtCapacity: this.processing.size >= this.maxConcurrent,
      createdAt: this.createdAt.toISOString(),
      uptime: Math.round((Date.now() - this.createdAt.getTime()) / 1000)
    };
  }

  /**
   * Get queue items
   */
  getQueueItems() {
    return this.queue;
  }

  /**
   * Get processing items
   */
  getProcessingItems() {
    return Array.from(this.processing).map(leadId => this.findItem(leadId));
  }

  /**
   * Get completed items
   */
  getCompletedItems() {
    return this.completed;
  }

  /**
   * Get failed items
   */
  getFailedItems() {
    return this.failed;
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    this.processing.clear();
    this.completed = [];
    this.failed = [];
  }

  /**
   * Get retry candidates
   */
  getRetryItems() {
    return this.failed.filter(item => item.attempts < 3);
  }

  /**
   * Get next batch to process
   */
  getNextBatch(batchSize = 5) {
    const batch = [];

    while (batch.length < batchSize && this.processing.size < this.maxConcurrent) {
      const item = this.dequeue();
      if (!item) break;
      batch.push(item);
    }

    return batch;
  }

  /**
   * Get queue health
   */
  getHealth() {
    const totalProcessed = this.completed.length;
    const totalFailed = this.failed.length;
    const successRate = totalProcessed / (totalProcessed + totalFailed) || 0;

    return {
      providerId: this.providerId,
      status: this.getStatus(),
      metrics: {
        totalProcessed,
        totalFailed,
        successRate: Math.round(successRate * 100) / 100,
        avgProcessingTime: this.getAvgProcessingTime()
      }
    };
  }

  /**
   * Calculate average processing time
   */
  getAvgProcessingTime() {
    if (this.completed.length === 0) return 0;

    const totalTime = this.completed.reduce((sum, item) => {
      const duration = item.processedAt - item.enqueuedAt;
      return sum + duration;
    }, 0);

    return Math.round(totalTime / this.completed.length);
  }

  /**
   * Get slowest items
   */
  getSlowestItems(count = 5) {
    return this.completed
      .sort((a, b) => {
        const durA = a.processedAt - a.enqueuedAt;
        const durB = b.processedAt - b.enqueuedAt;
        return durB - durA;
      })
      .slice(0, count);
  }
}

module.exports = ProviderQueue;
