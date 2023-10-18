document.addEventListener('DOMContentLoaded', function () {
    const hudDataElement = document.getElementById('hud-data');

    fetch('http://ergast.com/api/f1/current/last/results')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(xmlData => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlData, 'application/xml');

            const raceName = getTextContent(xmlDoc, 'RaceName');
            const circuitName = getTextContent(xmlDoc, 'CircuitName');
            const location = `${getTextContent(xmlDoc, 'Locality')}, ${getTextContent(xmlDoc, 'Country')}`;

            const resultsByDriver = {};
            xmlDoc.querySelectorAll('Result').forEach(result => {
                const driverName = `${getTextContent(result, 'GivenName')} ${getTextContent(result, 'FamilyName')}`;

                if (!resultsByDriver[driverName]) {
                    resultsByDriver[driverName] = [];
                }

                const position = result.getAttribute('position');
                const gridPosition = getTextContent(result, 'Grid') || 'N/A';
                const constructor = getTextContent(result, 'Constructor Name');
                const status = getTextContent(result, 'Status');
                let time = getTextContent(result, 'Time');
                const fastestLapTime = getTextContent(result, 'FastestLap Time') || 'N/A';

                // Ajuste para los pilotos que no terminan
                if (status !== 'Finished') {
                    if (status.includes('+')) {
                        time = status;
                    } else {
                        time = `${status} (DNF)`;
                    }
                }

                resultsByDriver[driverName].push({
                    position,
                    gridPosition,
                    constructor,
                    time,
                    fastestLapTime,
                });
            });

            const infoString = `
                <div class="container">
                    <div class="section-box">
                        <p style="font-weight: bold; font-size: 30px;">RACE: ${raceName}</p>
                    </div>
                    <div class="section-box">
                        <p style="font-weight: bold; font-size: 30px;">CIRCUIT: ${circuitName}</p>
                    </div>
                    <div class="section-box">
                        <p style="font-weight: bold; font-size: 30px;">CIRCUIT LOCATION: ${location}</p>
                    </div>

                    <div class="result-sections section-box2">
                        <div class="result-section section-box">
                            <table class="result-table">
                                <thead>
                                    <tr>
                                        <th style="text-align: left; text-transform: uppercase;">Position/Driver</th>
                                        <th style="text-transform: uppercase;">Constructor</th>
                                        <th style="text-transform: uppercase;">Time</th>
                                        <th style="text-transform: uppercase;">Fastest Lap</th>
                                        <th style="text-transform: uppercase;">Grid</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.keys(resultsByDriver).map(driverName => `
                                        <tr>
                                            <td style="text-align:left;">
                                                <span class="position" style="font-weight:bold;">${resultsByDriver[driverName][0].position}.</span>
                                                <span class="driver">${driverName}</span>
                                            </td>
                                            <td>${resultsByDriver[driverName][0].constructor}</td>
                                            <td>${resultsByDriver[driverName][0].time}</td>
                                            <td>${resultsByDriver[driverName][0].fastestLapTime}</td>
                                            <td>${resultsByDriver[driverName][0].gridPosition}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            hudDataElement.innerHTML = infoString;
        })
        .catch(error => {
            console.error('Error al hacer la solicitud:', error);
            hudDataElement.textContent = 'Error al obtener datos';
        });
});

function getTextContent(element, tagName) {
    const targetElement = element.querySelector(tagName);
    return targetElement ? targetElement.textContent.trim() : 'N/A';
}
