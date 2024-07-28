import requests
import pandas as pd
import os

# URL de la API
url = "https://api.ejemplo.com/datos"

try:
    # Hacer la petición a la API
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()

    # Convertir los datos a un DataFrame de pandas
    df = pd.DataFrame(data)

    # Guardar el DataFrame en un archivo CSV
    df.to_csv("datos_api.csv", index=False)
except Exception as e:
    print(f"Error al obtener los datos de la API: {e}")
