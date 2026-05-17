export const calculateScore = (uomType, target, actual, deadline, completionDate) => {
  if (actual === null || actual === undefined) return null;

  switch (uomType) {
    case 'min':
      // Higher actual = better (e.g. sales revenue)
      return target === 0 ? 0 : Math.min((actual / target) * 100, 100);

    case 'max':
      // Lower actual = better (e.g. response time, cost)
      return actual === 0 ? 100 : Math.min((target / actual) * 100, 100);

    case 'zero':
      // Zero = perfect (e.g. safety incidents)
      return actual === 0 ? 100 : 0;

    case 'timeline':
      // Completed on or before deadline = 100%
      if (!completionDate || !deadline) return null;
      return new Date(completionDate) <= new Date(deadline) ? 100 : 0;

    default:
      return null;
  }
};