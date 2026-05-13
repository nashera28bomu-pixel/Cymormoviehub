/**
 * Checks if a match is starting within the next hour
 * @param {string} kickoffTime - ISO Date string
 * @returns {boolean}
 */
const isLineupAvailable = (kickoffTime) => {
    const now = new Date();
    const kickoff = new Date(kickoffTime);
    const diffInMinutes = (kickoff - now) / 1000 / 60;
    
    // Lineups usually drop 60 mins before kickoff
    return diffInMinutes <= 60 && diffInMinutes > -105; 
};

/**
 * Formats the match status into human-readable text
 */
const formatStatus = (status) => {
    const statusMap = {
        'NS': 'Upcoming',
        '1H': 'Live - 1st Half',
        'HT': 'Half Time',
        '2H': 'Live - 2nd Half',
        'FT': 'Finished',
        'PST': 'Postponed'
    };
    return statusMap[status] || status;
};

module.exports = { isLineupAvailable, formatStatus };
