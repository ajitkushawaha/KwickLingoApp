import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onReport: (reason: string, description: string) => void;
  partnerId?: string;
}

const REPORT_REASONS = [
  'Inappropriate content',
  'Harassment',
  'Spam',
  'Underage user',
  'Violence or threats',
  'Nudity or sexual content',
  'Hate speech',
  'Other',
];

const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  onReport,
  partnerId,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleReport = () => {
    if (!selectedReason) {
      Alert.alert('Please select a reason', 'You must select a reason for reporting this user.');
      return;
    }

    onReport(selectedReason, description);
    setSelectedReason('');
    setDescription('');
    onClose();

    Alert.alert(
      'Report Submitted',
      'Thank you for your report. We will review it and take appropriate action.',
      [{ text: 'OK' }]
    );
  };

  const renderReasonButton = (reason: string) => (
    <TouchableOpacity
      key={reason}
      style={[
        styles.reasonButton,
        selectedReason === reason && styles.selectedReasonButton,
      ]}
      onPress={() => setSelectedReason(reason)}
    >
      <Text style={[
        styles.reasonText,
        selectedReason === reason && styles.selectedReasonText,
      ]}>
        {reason}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Report User</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Help us keep the community safe by reporting inappropriate behavior.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for reporting:</Text>
            <View style={styles.reasonsContainer}>
              {REPORT_REASONS.map(renderReasonButton)}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional details (optional):</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Please provide more details about the incident..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
              <Text style={styles.reportButtonText}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  selectedReasonButton: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedReasonText: {
    color: '#fff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  reportButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReportModal;
