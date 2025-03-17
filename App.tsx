import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import { FontAwesome } from "@expo/vector-icons";

let db: SQLiteDatabase | null = null;

const initializeDB = async () => {
  db = await openDatabaseAsync("notes.db");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note TEXT
    );`);
};

export default function App() {
  const [notes, setNotes] = useState<{ id: number; note: string }[]>([]);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    initializeDB().then(loadNotes);
  }, []);

  const loadNotes = async () => {
    if (!db) return;
    const results = await db.getAllAsync(
      `SELECT * FROM notes WHERE note LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?;`,
      [`%${search}%`, limit, page * limit]
    );
    setNotes(page === 0 ? results : [...notes, ...results]);
  };

  const addNote = async () => {
    if (!currentNote.trim() || !db) return;
    await db.runAsync("INSERT INTO notes (note) VALUES (?);", [currentNote]);
    setCurrentNote("");
    setModalVisible(false);
    setPage(0);
    loadNotes();
  };

  const updateNote = async () => {
    if (!currentNote.trim() || editingNoteId === null || !db) return;
    await db.runAsync("UPDATE notes SET note = ? WHERE id = ?;", [currentNote, editingNoteId]);
    setModalVisible(false);
    setCurrentNote("");
    setEditingNoteId(null);
    setPage(0);
    loadNotes();
  };

  const deleteNote = async () => {
    if (deleteNoteId === null || !db) return;
    await db.runAsync("DELETE FROM notes WHERE id = ?;", [deleteNoteId]);
    setModalDeleteVisible(false);
    setDeleteNoteId(null);
    setPage(0);
    loadNotes();
  };

  const openEditModal = (note: string, id: number) => {
    setCurrentNote(note);
    setEditingNoteId(id);
    setModalVisible(true);
  };

  const openAddModal = () => {
    setCurrentNote("");
    setEditingNoteId(null);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Pesquisar notas..."
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          setPage(0);
          loadNotes();
        }}
      />
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={() => {
          setPage((prev) => prev + 1);
          loadNotes();
        }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEditModal(item.note, item.id)}>
            <Text>{item.note.length > 30 ? item.note.substring(0, 30) + "..." : item.note}</Text>
            <TouchableOpacity onPress={() => { setDeleteNoteId(item.id); setModalDeleteVisible(true); }}>
              <FontAwesome name="trash" size={20} color="#FD5523" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => openAddModal()}>
        <FontAwesome name="plus" size={20} color="white" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
          <TextInput style={styles.input} value={currentNote} onChangeText={setCurrentNote} placeholder="Digite a nota..." />
          <TouchableOpacity style={styles.saveButton} onPress={editingNoteId ? updateNote : addNote}>
            <Text style={styles.saveButtonText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={modalDeleteVisible} transparent animationType="slide">
        <View style={styles.modalView}>
          <Text>Você deseja deletar esta Nota?</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveButton} onPress={deleteNote}>
              <Text style={styles.saveButtonText}>Sim</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalDeleteVisible(false)}>
              <Text style={styles.closeButtonText}>Não</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBE6", padding: 10, paddingTop: 40 },
  searchInput: { backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 20, marginVertical: 12 },
  card: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 10, backgroundColor: "#B9E4C9", borderRadius: 10, marginVertical: 6 },
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: "#FD5523", padding: 18, borderRadius: 40, elevation: 5 },
  modalView: { backgroundColor: "#ffffff", padding: 20, margin: 20, borderRadius: 10, elevation: 5 },
  input: { backgroundColor: "#fff", width: "100%", padding: 12, marginBottom: 10, borderRadius: 5 },
  saveButton: { backgroundColor: "#356859", padding: 10, borderRadius: 5, alignSelf: "flex-end" },
  saveButtonText: { color: "#FFFBE6", textAlign: "center" },
  closeButton: { alignSelf: "flex-end", padding: 5 },
  closeButtonText: { fontSize: 18, color: "#FD5523" },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 10 },
});
