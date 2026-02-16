import os
import PyPDF2

def convert_pdfs_to_text(directory):
    """
    Converts all PDF files in the specified directory to text files.
    """
    if not os.path.exists(directory):
        print(f"Directory not found: {directory}")
        return

    files = [f for f in os.listdir(directory) if f.lower().endswith('.pdf')]
    total_files = len(files)
    print(f"Found {total_files} PDF files in {directory}...")

    for i, filename in enumerate(files):
        pdf_path = os.path.join(directory, filename)
        txt_filename = os.path.splitext(filename)[0] + ".txt"
        txt_path = os.path.join(directory, txt_filename)

        # Skip if text file already exists
        if os.path.exists(txt_path):
            print(f"[{i+1}/{total_files}] Skipping {filename} (Text file already exists)")
            continue

        print(f"[{i+1}/{total_files}] Converting {filename}...")
        
        try:
            with open(pdf_path, 'rb') as pdf_file:
                try:
                    reader = PyPDF2.PdfReader(pdf_file)
                    text_content = []
                    
                    # Extract text from each page
                    for page_num in range(len(reader.pages)):
                        try:
                            page = reader.pages[page_num]
                            text = page.extract_text()
                            if text:
                                text_content.append(text)
                        except Exception as e:
                            print(f"  Warning: Could not extract text from page {page_num} of {filename}: {e}")

                    # Write to text file
                    with open(txt_path, 'w', encoding='utf-8') as txt_file:
                        txt_file.write("\n".join(text_content))
                        
                    print(f"  Successfully created {txt_filename}")
                    
                except Exception as e:
                    print(f"  Error reading PDF structure for {filename}: {e}")

        except Exception as e:
            print(f"  Error processing {filename}: {e}")

if __name__ == "__main__":
    target_dir = os.path.join("knowledge", "servicenow")
    convert_pdfs_to_text(target_dir)
