import qrcode
import os
import uuid

class QRService:
    def __init__(self):
        self.output_dir = "downloads"
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def generate_qr(self, data: str) -> str:
        # Konfigurasi QR Code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        # Buat gambar
        img = qr.make_image(fill_color="black", back_color="white")
        
        filename = f"qr_{uuid.uuid4().hex}.png"
        file_path = os.path.join(self.output_dir, filename)
        
        img.save(file_path)
        return file_path

qr_service = QRService()
