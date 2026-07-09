

const getQuery = (filter,startDate,endDate) => {
 
  let query ={}

  const today = new Date();

  // Day Filter
  if (filter === "day") {
    const start = new Date();

    start.setHours(0, 0, 0, 0);

    query.ordered_at = {
      $gte: start,
      $lte: today,
    };
  }

  // Week Filter
  else if (filter === "week") {
    const week = new Date();

    week.setDate(
      today.getDate() - 7
    );

    query.ordered_at = {
      $gte: week,
      $lte: today,
    };
  }

  // Month Filter
  else if (filter === "month") {
    const month = new Date();

    month.setMonth(
      today.getMonth() - 1
    );

    query.ordered_at = {
      $gte: month,
      $lte: today,
    };
  }

  // Year Filter
  else if (filter === "year") {
    const year = new Date();

    year.setFullYear(
      today.getFullYear() - 1
    );

    query.ordered_at = {
      $gte: year,
      $lte: today,
    };
  }

  // Custom Filter
  else if (
    filter === "custom" &&
    startDate &&
    endDate
  ) {
    query.ordered_at = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  return query;
};

module.exports = getQuery;