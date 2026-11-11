
import { useAudioPlayer } from 'expo-audio';
import {
  CameraType,
  CameraView,
  useCameraPermissions
} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCl57WJgUZPkjcvuAqH-msgUcqmy8fCs10",
  authDomain: "pokeapi-7e4f1.firebaseapp.com",
  projectId: "pokeapi-7e4f1",
  storageBucket: "pokeapi-7e4f1.firebasestorage.app",
  messagingSenderId: "774875434970",
  appId: "1:774875434970:web:7fbfd923cffa3fe94c7ae3",
  measurementId: "G-T55JQJRFNF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

interface PokeApiResult {
  name: string;
  url: string;
}

interface PokeApiResponse {
  results: PokeApiResult[];
}

interface PokemonItem {
  id: string;
  name: string;
  image: string;
  sound: string;
  types: string[];
  altura: number;
  peso: number;
}

const TYPE_COLORS: { [key: string]: string } = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705898',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};

export default function App() {
  const [pokemon, setPokemon] = useState<PokemonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [photo, setPhoto] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const player = useAudioPlayer(null);

  const fetchPokemon = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
          'https://pokeapi.co/api/v2/pokemon?limit=100&offset=0'
      );

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data: PokeApiResponse = await response.json();

      const detailedPokemonList = await Promise.all(
          data.results.map(async (poke) => {
            const id = poke.url.split('/')[6];

            const detailResponse = await fetch(poke.url);

            if (!detailResponse.ok) {
              throw new Error(
                  `Error ${detailResponse.status} en ${poke.name}`
              );
            }

            const detailData = await detailResponse.json();

            const types = detailData.types.map(
                (t: any) => t.type.name
            );

            return {
              id: id,
              name: poke.name,
              image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
              sound: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,
              types: types,
              altura: detailData.height / 10,
              peso: detailData.weight / 10,
            };
          })
      );

      setPokemon(detailedPokemonList);
    } catch (error) {
      console.error('Error al obtener los Pokémon:', error);

      setError(
          error instanceof Error
              ? error.message
              : 'No se pudieron cargar los Pokémon.'
      );
    } finally {
      setLoading(false);
    }
  };

  const playSound = async (uri: string) => {
    try {
      player.pause();
      player.replace({ uri });
      player.play();

      await Haptics.impactAsync(
          Haptics.ImpactFeedbackStyle.Heavy
      );
    } catch (error) {
      console.error('Error al reproducir audio:', error);
    }
  };

  const abrirCamara = async () => {
    try {
      if (!permission?.granted) {
        const resultado = await requestPermission();

        if (!resultado.granted) {
          return;
        }
      }

      setPhoto(null);
      setCameraOpen(true);
    } catch (error) {
      console.error('Error al abrir la cámara:', error);
    }
  };

  const tomarFoto = async () => {
    try {
      if (!cameraRef.current) return;

      const foto = await cameraRef.current.takePictureAsync();

      if (foto?.uri) {
        setPhoto(foto.uri);

        await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
        );
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
    }
  };

  const cambiarCamara = () => {
    setFacing(actual =>
        actual === 'back' ? 'front' : 'back'
    );
  };

  useEffect(() => {
    fetchPokemon();
  }, []);

  if (cameraOpen) {
    return (
        <SafeAreaView style={styles.container}>
          <Text style={styles.title}>Cámara Pokémon</Text>

          {photo ? (
              <View style={styles.cameraContainer}>
                <Image
                    source={{ uri: photo }}
                    style={styles.camera}
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => setPhoto(null)}
                >
                  <Text style={styles.buttonText}>
                    📷 Tomar otra foto
                  </Text>
                </TouchableOpacity>
              </View>
          ) : (
              <View style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={cambiarCamara}
                >
                  <Text style={styles.buttonText}>
                    🔄 Cambiar cámara
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={tomarFoto}
                >
                  <Text style={styles.buttonText}>
                    📸 Tomar foto
                  </Text>
                </TouchableOpacity>
              </View>
          )}

          <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCameraOpen(false)}
          >
            <Text style={styles.buttonText}>
              Volver a la Pokédex
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
    );
  }

  if (loading) {
    return (
        <View style={styles.center}>
          <ActivityIndicator
              size="large"
              color="#E3350D"
          />
          <Text>Cargando Pokédex...</Text>
        </View>
    );
  }

  return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Pokédex</Text>

        <TouchableOpacity
            style={styles.cameraButton}
            onPress={abrirCamara}
        >
          <Text style={styles.buttonText}>
            📷 Abrir cámara
          </Text>
        </TouchableOpacity>

        {error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>

              <TouchableOpacity
                  style={styles.button}
                  onPress={fetchPokemon}
              >
                <Text style={styles.buttonText}>
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
        ) : (
            <FlatList
                data={pokemon}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                      <Image
                          source={{ uri: item.image }}
                          style={styles.image}
                      />

                      <Text style={styles.name}>
                        {item.name}
                      </Text>

                      <View style={styles.typesContainer}>
                        {item.types.map((type, index) => (
                            <View
                                key={index}
                                style={[
                                  styles.typeBadge,
                                  {
                                    backgroundColor:
                                        TYPE_COLORS[type] || '#777',
                                  },
                                ]}
                            >
                              <Text style={styles.typeText}>
                                {type}
                              </Text>
                            </View>
                        ))}
                      </View>

                      <Text>Altura: {item.altura} m</Text>
                      <Text>Peso: {item.peso} kg</Text>

                      <TouchableOpacity
                          style={styles.button}
                          onPress={() => playSound(item.sound)}
                      >
                        <Text style={styles.buttonText}>
                          🔊 Escuchar
                        </Text>
                      </TouchableOpacity>
                    </View>
                )}
            />
        )}
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 8,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 100,
    height: 100,
  },
  name: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    color: '#333',
  },
  typesContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#E3350D',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cameraButton: {
    backgroundColor: '#E3350D',
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  camera: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  closeButton: {
    backgroundColor: '#333',
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#E3350D',
    textAlign: 'center',
    marginBottom: 15,
  },
});
