class GoalSimEngine {
  async simulate(input, etfData) {
    throw new Error('simulate method must be implemented');
  }

  vectorCagr(prices) {
    const monthlyReturns = this.toMonthlyLogReturns(prices);
    return monthlyReturns.reduce((sum, ret) => sum + ret, 0);
  }

  toMonthlyLogReturns(prices) {
    const monthlyReturns = [];

    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1].price;
      const currPrice = prices[i].price;
      const logReturn = Math.log(currPrice / prevPrice);
      monthlyReturns.push(logReturn);
    }

    return monthlyReturns;
  }

  requiredCagr(targetAmount, initialAmount, monthlyContribution, years) {
    const totalMonths = years * 12;
    const totalContribution = initialAmount + monthlyContribution * totalMonths;

    if (totalContribution >= targetAmount) {
      return 0;
    }

    const requiredReturn = targetAmount / totalContribution;
    const cagr = requiredReturn ** (1 / years) - 1;

    return Math.round(cagr * 100 * 100) / 100;
  }

  dcaSim(cagr, months, initialAmount, monthlyContribution, timing) {
    let currentAmount = initialAmount;

    for (let month = 0; month < months; month++) {
      const monthlyReturn = (1 + cagr) ** (1 / 12) - 1;

      if (timing === 'start') {
        currentAmount = (currentAmount + monthlyContribution) * (1 + monthlyReturn);
      } else {
        currentAmount = currentAmount * (1 + monthlyReturn) + monthlyContribution;
      }
    }
    return currentAmount;
  }
}

module.exports = { GoalSimEngine };
