document.addEventListener('DOMContentLoaded', function () {
    const hudDataElement = document.getElementById('hud-data');
    const teamColors = {
        'McLaren': 'rgb(255, 128, 0)',
        'Mercedes': 'rgb(39, 244, 210)',
        'Red Bull': 'rgb(54, 113, 198)',
        'Ferrari': 'rgb(232, 0, 32)',
        'Aston Martin': 'rgb(34, 153, 113)',
        'RB F1 Team': 'rgb(102, 146, 255)',
        'Haas F1 Team': 'rgb(182, 186, 189)',
        'Williams': 'rgb(100, 196, 255)',
        'Sauber': 'rgb(82, 226, 82)',
        'Alpine F1 Team': 'rgb(0, 147, 204)',
    };

    const constructorLogos = {
        'McLaren': 'img/mclaren.png',
        'Mercedes': 'img/mercedes.png',
        'Red Bull': 'img/redbull.png',
        'Ferrari': 'img/ferrari.png',
        'Aston Martin': 'img/astonmartin.png',
        'RB F1 Team': 'img/rb.png',
        'Haas F1 Team': 'img/haas.png',
        'Williams': 'img/williams.png',
        'Sauber': 'img/sauber.png',
        'Alpine F1 Team': 'img/alpine.png',
    };

    fetch('https://ergast.com/api/f1/current/last/results')
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
                const givenName = getTextContent(result, 'GivenName');
                const familyName = getTextContent(result, 'FamilyName');
                const fullName = `${givenName} ${familyName}`;

                if (!resultsByDriver[fullName]) {
                    resultsByDriver[fullName] = [];
                }

                const position = result.getAttribute('position');
                let gridPosition = getTextContent(result, 'Grid');
                if (gridPosition === '0') {
                    gridPosition = 'PIT';
                } else {
                    gridPosition = gridPosition || 'N/A';
                }

                const constructor = getTextContent(result, 'Constructor Name');
                const status = getTextContent(result, 'Status');
                let time = getTextContent(result, 'Time');
                const fastestLapTime = getTextContent(result, 'FastestLap Time') || 'N/A';

                if (status !== 'Finished') {
                    time = status.includes('+') || status === 'DISQUALIFIED' ? status : `${status} (DNF)`;
                }

                resultsByDriver[fullName].push({
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
                    <p style="font-weight: bold;">RACE: ${raceName}</p>
                </div>
                <div class="section-box">
                    <p style="font-weight: bold;">CIRCUIT: ${circuitName}</p>
                </div>
                <div class="section-box">
                    <p style="font-weight: bold;">CIRCUIT LOCATION: ${location}</p>
                </div>
        
                <div class="result-sections section-box2">
                    <div class="result-section section-box">
                        <table class="result-table">
                            <thead class="titles1">
                                <tr>
                                    <th style="text-align: left; text-transform: uppercase;">Position/Driver</th>
                                    <th style="text-transform: uppercase;">Constructor</th>
                                    <th style="text-transform: uppercase;">Time</th>
                                    <th style="text-transform: uppercase;">Fastest Lap</th>
                                    <th style="text-transform: uppercase;">Grid</th>
                                </tr>
                            </thead>
                            <tbody>
                            ${Object.keys(resultsByDriver).map(fullName => {
                                const [givenName, familyName] = fullName.split(' ');
                                const constructorLogo = constructorLogos[resultsByDriver[fullName][0].constructor] || 'img/default.png'; // Fallback logo
                                const excludedConstructors = new Set(['McLaren', 'Red Bull', 'Haas F1 Team', 'Alpine F1 Team', 'Aston Martin']);
                                const showConstructorName = !excludedConstructors.has(resultsByDriver[fullName][0].constructor);
                                return `
                                    <tr>
                                        <td style="text-align:left; color: ${teamColors[resultsByDriver[fullName][0].constructor] || 'inherit'};">
                                            <span class="position" style="font-weight:bold; display: inline-block; vertical-align: top;">${resultsByDriver[fullName][0].position}.</span>
                                            <span class="driver">
                                                <span style="display: inline-block; vertical-align: top;">
                                                    <span class="given-name">${givenName}</span>
                                                    <span class="family-name">${familyName}</span>
                                                </span>
                                            </span>
                                        </td>
                                        <td style="color: ${['McLaren', 'Red Bull'].includes(resultsByDriver[fullName][0].constructor) ? teamColors[resultsByDriver[fullName][0].constructor] : 'inherit'};">
                                            <img src="${constructorLogo}" alt="${resultsByDriver[fullName][0].constructor}" class="constructor-logo">
                                            ${['McLaren', 'Red Bull', 'Haas F1 Team', 'Alpine F1 Team', 'Aston Martin'].includes(resultsByDriver[fullName][0].constructor) ? '' : resultsByDriver[fullName][0].constructor}
                                        </td>
                                        <td>${resultsByDriver[fullName][0].time}</td>
                                        <td>${resultsByDriver[fullName][0].fastestLapTime}</td>
                                        <td>${resultsByDriver[fullName][0].gridPosition}</td>
                                    </tr>
                                `;
                            }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        
        

            hudDataElement.innerHTML = infoString;

            document.querySelectorAll('.result-table tbody tr').forEach(row => {
                const positionDriverCell = row.children[0];
                const constructorCell = row.children[1];
                const team = constructorCell.textContent.trim();
                if (teamColors[team]) {
                    positionDriverCell.style.color = teamColors[team];
                    constructorCell.style.color = teamColors[team];
                }
            });
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
