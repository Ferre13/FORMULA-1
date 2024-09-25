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

    let isFastestLapSorted = false; // Estado de orden para "Fastest Lap"
    let raceData = null; // Almacenar los datos de la carrera

    // Función para alternar el ícono de la flecha en el encabezado "Fastest Lap"
    function toggleFastestLapIcon() {
        const fastestLapIcon = document.getElementById('fastest-lap-icon');
        fastestLapIcon.textContent = isFastestLapSorted ? '▼' : '▲'; // Cambia el icono
    }

    // Función para ordenar los resultados por "Fastest Lap" (de menor a mayor)
    function sortResultsByFastestLap(resultsByDriver) {
        const sortedDrivers = Object.keys(resultsByDriver).sort((a, b) => {
            const lapTimeA = resultsByDriver[a][0].fastestLapTime === 'N/A' ? Infinity : parseTime(resultsByDriver[a][0].fastestLapTime);
            const lapTimeB = resultsByDriver[b][0].fastestLapTime === 'N/A' ? Infinity : parseTime(resultsByDriver[b][0].fastestLapTime);
            return lapTimeA - lapTimeB; // Orden de menor a mayor
        });

        // Reorganizar los datos según el orden
        const sortedResults = {};
        sortedDrivers.forEach(driver => {
            sortedResults[driver] = resultsByDriver[driver];
        });

        // Renderizar los datos ordenados
        renderData({ ...raceData, resultsByDriver: sortedResults });
    }

    // Función para convertir el tiempo de vuelta en milisegundos
    function parseTime(timeStr) {
        const [minutes, seconds] = timeStr.split(':').map(parseFloat);
        return (minutes * 60 + seconds) * 1000;
    }

    // Función para obtener datos de la API
    function fetchDataFromAPI() {
        console.log('Fetching data from API...');
        const startTime = performance.now();

        return fetch('https://ergast.com/api/f1/current/last/results')
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
                
                // Verificar si se obtuvieron resultados válidos
                if (data && Object.keys(data.resultsByDriver).length > 0) {
                    localStorage.setItem('raceData', JSON.stringify(data));
                    const endTime = performance.now();
                    console.log(`API Data fetched in ${endTime - startTime} ms`);
                    raceData = data; // Almacenar datos de la carrera
                    renderData(data);
                } else {
                    throw new Error('No data returned from API');
                }
            });
    }

    // Función para analizar datos XML
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
            if (gridPosition === '0') {
                gridPosition = 'PIT';
            } else {
                gridPosition = gridPosition || 'N/A';
            }

            const constructor = getTextContent(result, 'Constructor Name');
            const status = getTextContent(result, 'Status');
            let time = getTextContent(result, 'Time');
            const fastestLapTime = getTextContent(result, 'FastestLap Time') || 'N/A';
            const fastestLap = result.querySelector('FastestLap');
            const fastestLapPosition = fastestLap ? fastestLap.getAttribute('rank') : 'N/A';

            if (position === 'D') {
                time = `${time} (DSQ)`;
            } else if (status !== 'Finished') {
                if (status.includes('+')) {
                    time = status;
                } else {
                    time = `${status} (DNF)`;
                }
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

    // Función para obtener el contenido de texto de un elemento
    function getTextContent(element, tagName) {
        const targetElement = element.querySelector(tagName);
        return targetElement ? targetElement.textContent.trim() : 'N/A';
    }

    // Función para renderizar los datos
    function renderData(data) {
        const { raceName, circuitName, location, resultsByDriver } = data;

        if (!resultsByDriver || Object.keys(resultsByDriver).length === 0) {
            hudDataElement.textContent = 'No hay datos disponibles para mostrar.';
            return;
        }

        let fastestLapDriver = null;

        Object.keys(resultsByDriver).forEach(fullName => {
            const driverData = resultsByDriver[fullName][0];
            const fastestLapPosition = driverData.fastestLapPosition;
            if (fastestLapPosition === '1') { // Si tiene la vuelta rápida más rápida
                fastestLapDriver = fullName;
            }
        });
        
        if (fastestLapDriver) {
            console.log(`El conductor con la vuelta más rápida es: ${fastestLapDriver}`);
        } else {
            console.log('No hay un conductor que haya registrado la vuelta más rápida.');
        }

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
                                    <th id="fastest-lap-header" style="cursor: pointer; text-transform: uppercase;">Fastest Lap <span id="fastest-lap-icon">▼</span></th>
                                    <th style="text-transform: uppercase;">Grid</th>
                                </tr>
                            </thead>
                            <tbody>
                            ${Object.keys(resultsByDriver).map(fullName => {
                                const [givenName, familyName] = fullName.split(' ');
                                const constructorLogo = constructorLogos[resultsByDriver[fullName][0].constructor] || 'img/default.png'; // Fallback logo
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

        // Agregar evento de clic para ordenar por "Fastest Lap"
        document.getElementById('fastest-lap-header').addEventListener('click', () => {
            if (isFastestLapSorted) {
                // Volver al orden original de la carrera
                renderData(raceData);
                isFastestLapSorted = false;
            } else {
                isFastestLapSorted = true; // Activar el estado de orden
                sortResultsByFastestLap(resultsByDriver); // Ordenar y renderizar
            }
        });
    }

    // Función para cargar y renderizar los datos desde localStorage
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

    // Intentar cargar desde localStorage primero
    loadFromLocalStorage();

    // Luego, intentar obtener los datos de la API
    fetchDataFromAPI().catch(error => {
        console.error('Error fetching data from API:', error);
    });
});
