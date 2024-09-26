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

    let isFastestLapSorted = false; 
    let raceData = null;

    function sortResultsByFastestLap(resultsByDriver) {
        const sortedDrivers = Object.keys(resultsByDriver).sort((a, b) => {
            const lapTimeA = resultsByDriver[a][0].fastestLapTime === 'N/A' ? Infinity : parseTime(resultsByDriver[a][0].fastestLapTime);
            const lapTimeB = resultsByDriver[b][0].fastestLapTime === 'N/A' ? Infinity : parseTime(resultsByDriver[b][0].fastestLapTime);
            return lapTimeA - lapTimeB; 
        });

        const sortedResults = {};
        sortedDrivers.forEach(driver => {
            sortedResults[driver] = resultsByDriver[driver];
        });

        renderData({ ...raceData, resultsByDriver: sortedResults });
    }

    function parseTime(timeStr) {
        const [minutes, seconds] = timeStr.split(':').map(parseFloat);
        return (minutes * 60 + seconds) * 1000;
    }

    function fetchDataFromAPI(year = 'current', round = 'last') {
        console.log(`Fetching data from API for year: ${year}, round: ${round}...`);
        const startTime = performance.now();

        return fetch(`https://ergast.com/api/f1/${year}/${round}/results`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(xmlData => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlData, 'application/xml');
                const data = parseXMLData(xmlDoc);

                if (data && Object.keys(data.resultsByDriver).length > 0) {
                    localStorage.setItem('raceData', JSON.stringify(data));
                    const endTime = performance.now();
                    console.log(`API Data fetched in ${endTime - startTime} ms`);
                    raceData = data; 
                    renderData(data);
                } else {
                    throw new Error('No data returned from API');
                }
            });
    }

    function parseXMLData(xmlDoc) {
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
            gridPosition = gridPosition === '0' ? 'PIT' : gridPosition || 'N/A';

            const constructor = getTextContent(result, 'Constructor Name');
            const status = getTextContent(result, 'Status');
            let time = getTextContent(result, 'Time');
            const fastestLapTime = getTextContent(result, 'FastestLap Time') || 'N/A';
            const fastestLap = result.querySelector('FastestLap');
            const fastestLapPosition = fastestLap ? fastestLap.getAttribute('rank') : 'N/A';

            if (position === 'D') {
                time = `${time} (DSQ)`;
            } else if (status !== 'Finished') {
                time = status.includes('+') ? status : `${status} (DNF)`;
            }

            resultsByDriver[fullName].push({
                position,
                gridPosition,
                constructor,
                time,
                fastestLapTime,
                fastestLapPosition,
            });
        });

        return { raceName, circuitName, location, resultsByDriver };
    }

    function getTextContent(element, tagName) {
        const targetElement = element.querySelector(tagName);
        return targetElement ? targetElement.textContent.trim() : 'N/A';
    }

    function renderData(data) {
        const { raceName, circuitName, location, resultsByDriver } = data;
    
        if (!resultsByDriver || Object.keys(resultsByDriver).length === 0) {
            hudDataElement.textContent = 'No hay datos disponibles para mostrar.';
            return;
        }
    
        let fastestLapDriver = null;
    
        Object.keys(resultsByDriver).forEach(fullName => {
            const driverData = resultsByDriver[fullName][0];
            if (driverData.fastestLapPosition === '1') {
                fastestLapDriver = fullName;
            }
        });
    
        console.log(fastestLapDriver ? `El conductor con la vuelta más rápida es: ${fastestLapDriver}` : 'No hay un conductor que haya registrado la vuelta más rápida.');
    
        const infoString = `
            <div class="container">
                <div class="section-box">
                    <p style="font-weight: bold; cursor: pointer;" id="race-click">RACE: ${raceName}</p>
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
                                    <th id="fastest-lap-header" style="cursor: pointer; text-transform: uppercase;">Fastest Lap <span id="fastest-lap-icon">▼</span></th>
                                    <th style="text-transform: uppercase;">Grid</th>
                                </tr>
                            </thead>
                            <tbody>
                            ${Object.keys(resultsByDriver).map(fullName => {
                                const [givenName, familyName] = fullName.split(' ');
                                const constructorLogo = constructorLogos[resultsByDriver[fullName][0].constructor] || 'img/default.png';
                                const excludedConstructors = new Set(['McLaren', 'Red Bull', 'Haas F1 Team', 'Alpine F1 Team', 'Aston Martin']);
                                const showConstructorName = !excludedConstructors.has(resultsByDriver[fullName][0].constructor);
                                const fastestLapClass = (fullName === fastestLapDriver) ? 'fastest-lap' : '';
                                return `
                                    <tr class="${fastestLapClass}">
                                        <td style="text-align:left; color: ${teamColors[resultsByDriver[fullName][0].constructor] || 'inherit'};">
                                            <span class="position">${resultsByDriver[fullName][0].position}.</span>
                                            <span class="driver">
                                                <span>
                                                    <span class="given-name">${givenName}</span>
                                                    <span class="family-name">${familyName}</span>
                                                </span>
                                            </span>
                                        </td>
                                        <td style="color: ${['McLaren', 'Red Bull'].includes(resultsByDriver[fullName][0].constructor) ? teamColors[resultsByDriver[fullName][0].constructor] : 'inherit'};">
                                            <img src="${constructorLogo}" alt="${resultsByDriver[fullName][0].constructor}" class="constructor-logo">
                                            ${showConstructorName ? resultsByDriver[fullName][0].constructor : ''}
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
    
                <div id="select-race" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000;">
                    <div class="section-box" style="text-align: center; border: 8px solid #2D3031;"> <!-- Centramos el contenido -->
                        <h1 style="margin-bottom: 20px;">RACE SELECTION:</h1>
    
                        <div style="margin-bottom: 15px; font-weight: 400; font-family: 'Orbitron';">
                            <label for="year-selector">Year:</label>
                            <select id="year-selector" style="margin-left: 10px; font-family: 'Orbitron';"></select>
                        </div>

                        <div style="margin-bottom: 20px; font-weight: 400; font-family: 'Orbitron';">
                            <label for="race-selector">Race:</label>
                            <select id="race-selector" style="margin-left: 10px; font-family: 'Orbitron';"></select>
                        </div>

                        <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
                            <button id="apply-selection" style="padding: 10px 20px; font-family: 'Orbitron';">Apply</button>
                            <button id="cancel-selection" style="padding: 10px 20px; font-family: 'Orbitron';">Cancel</button>
                        </div>
                    </div>
                </div>
    
            </div>
        `;
    
        const overlay = document.createElement('div');
        overlay.id = 'overlay';  // Añadir ID para referenciar
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.display = 'none'; 
        overlay.style.zIndex = '9999'; 
        document.body.appendChild(overlay);
    
        function showOverlay() {
            // Mostrar el tinte de fondo
            document.getElementById('overlay').style.display = 'block'; 
            // Mostrar el contenido modal (select-race)
            document.getElementById('select-race').style.display = 'block'; 
            populateYearSelector(); // Cargar los años en el selector
        }
    
        // Función para ocultar el tinte de fondo y el modal
        function hideOverlay() {
            // Ocultar el selector de carrera
            const raceSelectorOverlay = document.getElementById('select-race');
            if (raceSelectorOverlay) {
                raceSelectorOverlay.style.display = 'none';
            }
            
            // Ocultar el fondo de tinte (overlay)
            const overlay = document.getElementById('overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    
        hudDataElement.innerHTML = infoString;
    
        document.getElementById('race-click').addEventListener('click', showOverlay);
        overlay.addEventListener('click', hideOverlay);
        document.getElementById('apply-selection').addEventListener('click', applySelection);
    
        function applySelection() {
            const year = document.getElementById('year-selector').value;
            const round = document.getElementById('race-selector').value;
            fetchDataFromAPI(year, round).catch(error => {
                console.error('Error fetching data from API:', error);
            });
            hideOverlay();
        }
    
        document.getElementById('cancel-selection').addEventListener('click', hideOverlay);
    
        document.querySelectorAll('.result-table tbody tr').forEach(row => {
            const positionDriverCell = row.children[0];
            const constructorCell = row.children[1];
            const team = constructorCell.textContent.trim();
            if (teamColors[team]) {
                positionDriverCell.style.color = teamColors[team];
                constructorCell.style.color = teamColors[team];
            }
        });
    
        document.getElementById('fastest-lap-header').addEventListener('click', () => {
            if (isFastestLapSorted) {
                renderData(raceData);
                isFastestLapSorted = false;
            } else {
                isFastestLapSorted = true;
                sortResultsByFastestLap(resultsByDriver);
            }
        });
    }
    

    function populateYearSelector() {
        const yearSelector = document.getElementById('year-selector');
        const currentYear = new Date().getFullYear();

        for (let year = currentYear; year >= 1950; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelector.appendChild(option);
        }

        yearSelector.addEventListener('change', populateRaceSelector);
        populateRaceSelector(); // Populate races for the current year on load
    }

    function populateRaceSelector() {
        const year = document.getElementById('year-selector').value;
        const raceSelector = document.getElementById('race-selector');
        raceSelector.innerHTML = ''; // Limpiar opciones existentes
    
        // Obtener datos de las carreras para el año seleccionado
        fetch(`https://ergast.com/api/f1/${year}.json`)
            .then(response => response.json())
            .then(data => {
                const races = data.MRData.RaceTable.Races;
                races.forEach(race => {
                    const option = document.createElement('option');
                    option.value = race.round; // Usar el número de ronda para la carrera
                    
                    // Aplicar formato a la fecha de la carrera
                    const formattedDate = formatDate(race.date);
                    option.textContent = `${race.raceName} - ${formattedDate}`;
                    raceSelector.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error fetching races:', error);
            });
    }

    function formatDate(dateString) {
        const date = new Date(dateString); // Convertir el string a objeto Date
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' }); // Formato dd/MMMM
    }    

    function loadFromLocalStorage() {
        console.log('Loading data from localStorage...');
        const startTime = performance.now();

        const storedData = localStorage.getItem('raceData');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                if (data && data.resultsByDriver) {
                    renderData(data);
                } else {
                    hudDataElement.textContent = 'No hay datos almacenados disponibles.';
                }
            } catch (error) {
                console.error('Error parsing stored data:', error);
                hudDataElement.textContent = 'Error al cargar los datos almacenados.';
            }
        } else {
            hudDataElement.textContent = 'No hay datos almacenados disponibles.';
        }

        const endTime = performance.now();
        console.log(`Data loaded from localStorage in ${endTime - startTime} ms`);
    }

    loadFromLocalStorage();
    fetchDataFromAPI().catch(error => {
        console.error('Error fetching data from API:', error);
    });
});
