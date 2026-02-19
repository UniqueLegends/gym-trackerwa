from PIL import Image
for size,name in [(192,'icon-192.png'),(512,'icon-512.png')]:
    img = Image.new('RGB',(size,size),(0,0,0))
    img.save(name)
    print('created', name)
