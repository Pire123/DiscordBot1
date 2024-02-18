const { Client, GatewayIntentBits, Partials } = require("discord.js");
const http = require("http");
const https = require("https");
const { parseString } = require("xml2js");

const TOKEN = process.env.token
const OWNER = process.env.owner
const WALLETS_JSON_URL = process.env.wallets
const PORT = process.env.PORT

const prefix = "!";
const server = http.createServer();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
  ],
});
const kDeğeri = 2.75;
var Client_Closed = false

function Calc2(İtibariDeğer, ters = false, iskonto = 0) {
  /*
   * kDeğeri -> 1k robuxun değeri
   * İtibariDeğer -> Değişkendir, Robux veya para olabilir.
   */

  let robux = 0;
  let fiyat = 0;

  const kRobuxDeğeri = (kDeğeri * (100 - iskonto)) / 100;
  // İndirim ile paranın değerini değil robuxunun değerini değiştiriyoruz.

  if (!ters) {
    // İtibari Değer == Para
    let Robux = (İtibariDeğer * 1000) / kRobuxDeğeri;
    let düzenlenmiş_Robux = Math.floor(Robux);
    let Fiyat = (kRobuxDeğeri / 1000) * düzenlenmiş_Robux;
    let düzenlemiş_Fiyat = parseFloat(Fiyat.toFixed(2));

    robux = düzenlenmiş_Robux;
    fiyat = düzenlemiş_Fiyat;
  } else {
    // İtibari Değer == Robux
    let en_küçük_tam_sayıa_yuvarla = true;
    let Fiyat = (kRobuxDeğeri / 1000) * İtibariDeğer;

    let Robux = (Fiyat * 1000) / kRobuxDeğeri;
    let düzenlenmiş_Robux = Math.floor(Robux);

    Fiyat = (kRobuxDeğeri / 1000) * düzenlenmiş_Robux;
    let düzenlemiş_Fiyat = en_küçük_tam_sayıa_yuvarla
      ? parseFloat(Fiyat.toFixed(2))
      : Fiyat;

    robux = düzenlenmiş_Robux;
    fiyat = düzenlemiş_Fiyat;
  }

  return [fiyat, robux];
}

function isBetween(number, min, max) {
  return number >= min && number <= max;
}

var Kur = [];
var KurGüncellemePeriyodu = 30 * 60 * 1000;

var indirim = [
  [0, 9999, 0],
  [10000, 19999, 5],
  [20000, 30000, 10],
];

var baslangicZamani = null;
var loopStart = null

function HttpRequest(url) {
    return new Promise((resolve, reject) => {
      
        let req = https.request(url, (response) => {
            let data = ''; 
            response.on('data', (chunk) => { 
                data = data + chunk.toString(); 
            }); 

            response.on('end', () => { 
                resolve(JSON.parse(data));
            }); 
        });
       
        req.on('error', (e) => {
          reject(e.message);
        });
        // send the request
       req.end();
    });
}

function KurGüncelle() {
  return new Promise((resolve, reject) => {
    const url = "https://www.tcmb.gov.tr/kurlar/today.xml";
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          parseString(data, (err, result) => {
            if (err) {
              reject(err);
            } else {
              try {
                const dolar = parseFloat(
                  result.Tarih_Date.Currency.find(
                    (item) => item.$.Kod === "USD"
                  ).ForexSelling[0]
                );
                const euro = parseFloat(
                  result.Tarih_Date.Currency.find(
                    (item) => item.$.Kod === "EUR"
                  ).ForexSelling[0]
                );
                Kur = [dolar, euro];
                resolve([dolar, euro]);
              } catch (error) {
                reject(error);
              }
            }
          });
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

function DolarTL(dolar) {
  let TL = 0;
  TL = Kur[0] * dolar;
  let digit = 2;
  TL = Math.ceil(TL * (10 * digit)) / (10 * digit);
  return TL;
}

function TLDolar(TL) {
  let dolar = 0;
  dolar = 1 / Kur[0] * TL
  let digit = 4;
  dolar = Math.round(dolar * (10 * digit)) / (10 * digit);
  return dolar;
}

async function OnReady() {
  console.log("Kur Güncelleniyor...");
  await KurGüncelle();
  baslangicZamani = new Date();
  console.log("Hazır!");
}

var Collectors = []

function DisableCollector(collector,event_name = null) {

    if(event_name != null) {
      collector.removeAllListeners(event_name)
      console.log(event_name + " disconnect")
    }
  
    collector.stop()
    console.log("Collector Stop.")

}

//Collector değişkeni buna bağlı. 
function ClearCollectors() {
  Collectors.forEach((element) => {
          let bot_mes = element[0]
          let collector = element[1]
          let event_name = element[2]
          let run_time = element[3]
          let başlangıç = element[4]

          DisableCollector(collector,event_name)
          bot_mes.reactions.removeAll().catch(error => console.log('Failed to clear reactions.'));

      });
  Collectors = []
}

var Wallets_Json = null;

// Özellik message.delete()
function DeleteMessage(message) {
  message.delete().catch(error => {
    console.log('Mesajı silerken bir hata oluştu:', error);
  });
}

async function OnMessageCreate(message) {
  if (!message.guild) return;
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  if (message.channel.id != 1206254246656348211) {
    //return;
  }
  
  let admin = (message.author.id == OWNER)
  
  let suankiZaman = new Date();
  let gecenSure = suankiZaman - baslangicZamani;

  if (gecenSure >= KurGüncellemePeriyodu) { //
    console.log("Kur güncelleniyor...");

    await KurGüncelle();
     baslangicZamani = suankiZaman;
    
    /*
      await KurGüncelle().then(kur => {
        console.log("Dolar:", kur[0]);
        console.log("Euro:", kur[1]);
      }).catch(error => {
          console.error("Hata:", error);
      });
      */
  }

  let content = message.content.substring(1);
  let data = content.split(" ");

  let yanlış_kullanım = "Yanlış kullanım, doğrusu: **!robux 1000** veya **!fiyat dolar 2.75**"
   
  if (data.length > 3) {
    message.channel.send(yanlış_kullanım);
    return;
  }

  let fill = "1k robux şu an " + kDeğeri + " Tether USD";
  let end_content = null;
  let end_cal = null;

  if (data[0] == "robux") {
    if (data[1] != null) {
      let cal = Calc2(data[1], true, 0);
      let iskonto = -99;

      indirim.forEach(function (k) {
        if (isBetween(cal[1], k[0], k[1])) {
          iskonto = k[2];
          return;
        }
      });

      if (iskonto == -99) {
        return;
      }

      cal = Calc2(data[1], true, iskonto);

      if (isNaN(cal[1]) || isNaN(cal[0])) {
         message.channel.send(yanlış_kullanım);
        return;
      }

      end_cal = cal;

      end_content =
        cal[1] +
        " robux " +
        cal[0] +
        "  USDT (**" +
        DolarTL(cal[0]) +
        " TL değerinde**)";

      if (iskonto != 0) {
        end_content = end_content + "(**%" + iskonto + "**)";
      }
    } else {
      end_content = fill
    }
  } else if (data[0] == "fiyat") {
    if (isNaN(data[2])) {
        message.channel.send(yanlış_kullanım);
        return;
    }
    if (data[1] != null) {
      
      let birim = data[1].toLowerCase();
      let miktar = data[2]
      
      // para değeri dolardır.
      let para_değeri = 0;
      
      if (birim == "tl") {
        para_değeri = TLDolar(miktar)
      }
      else if (birim == "dolar") {
        para_değeri = miktar
      }
      
      //iki kez hesaplanıyor çünkü indirim yapıyor.
      let hesaplama = Calc2(para_değeri,false,0)
      let dolar = hesaplama[0]
      let robux = hesaplama[1]
      let iskonto = -99;

      indirim.forEach(function (k) {
        if (isBetween(robux, k[0], k[1])) {
          iskonto = k[2];
          return;
        }
      });

      if (iskonto == -99) {
        return;
      }

      hesaplama = Calc2(para_değeri,false,iskonto)
      dolar = hesaplama[0]
      robux = hesaplama[1]

      if (isNaN(robux)) {
        message.channel.send(yanlış_kullanım);
        return;
      }

      end_cal = hesaplama
      
      end_content = robux + " robux " + dolar + " USDT(** " + DolarTL(dolar) + " TL değerinde**)"
      
      if (iskonto != 0) {
        end_content = end_content + "(**%" + iskonto + "**)";
      }
    } else {
      end_content = fill
    }
  }else if (data[0] == "k" || data[0] == "kripto") {
    let body = Wallets_Json

    if (data[1] == null) {
      
      let engelle = ["important","emoji"]
      
      let str = ""
      let boundry = "------------==><===-------------\n"
      
      str = str + boundry
      
      for (var coin_name in body) {
          coin_data = body[coin_name]
        
          let min_str =  ""  
        
          min_str = min_str + boundry
        
          min_str = "-->> " + coin_name + "\n"
          for(var x in body[coin_name]) 
          {
            
            let önemli = false

            if (coin_data["important"].includes(x)) {
             önemli = true 
            }

            if (engelle.includes(x)) {
              continue;
            }
            
            min_str = min_str + x + ": " + coin_data[x]

            if (önemli) {
              min_str = min_str + "⚠️"
            }

          min_str = min_str + "\n" 
        }
          min_str = min_str + boundry
        
          str = str + min_str
      }
      
      end_content = str + "\n" + "**Yanında ünlem bulunanların yanlış yazılması geri dönülemez bir hataya sebep olur.**"
      
    }
    else{
      let değişken_para = data[1].toLowerCase();
      
      let kripto_para = null;
      let kripto_data = null
      
      for(var x in body){

        var coin_data = body[x]
        var coin_name = x

        if (x == null || coin_data.code == null) {
          console.log((coin_data.code))
          continue
        }

        var name_low = x.toLowerCase();
        var code = coin_data.code
        var code_low = coin_data.code.toLowerCase();

        if (değişken_para == code_low || değişken_para == name_low) {
          kripto_para = coin_name
          kripto_data = coin_data
          break;
        }

      }  
      
      if (kripto_para != null) {
        let str = kripto_para  + "\n"

        for(var x in kripto_data) {
          let önemli = false

          if (kripto_data["important"].includes(x)) {
           önemli = true 
          }

          if (önemli) 
            {
              str = str + "***"
            }

          str = str + x + ": " + kripto_data[x]

          if (önemli) 
            {
              str = str + "***"
            }

          str = str + "\n" 
        }

        if (data[2] == null) {
          end_content = str
        }
        else {
          let istek = data[2].toLowerCase();
          end_content = String(kripto_data[istek])
        }
      }
      else {
          end_content = "**" + değişken_para + "** diye bir kripto para sistemimizde yok."
      }
    }

  } else if (data[0] == "yardım") {
    end_content = "**!robux 1000** veya **!fiyat dolar 2.5**\nEn fazla 30000 robux alabilirsiniz.";
  } else if (data[0] == "temizle") {
    if (admin) {
      
      ClearCollectors()
      
      DeleteMessage(message)
      
      end_content = null
    }
  } else if (data[0] == "kapat") {
    if (admin) {
      
      ClearCollectors()
      
      DeleteMessage(message)
      end_content = null
      client.destroy()
      Client_Closed = true
      console.log("Bot kapandı.")
    }
  }
  
  
  if (end_content != null) {
    
    if (typeof end_content !== 'string') {
      end_content = "Yazılımsal hata. Kod: 1"
    }
    
    message.channel.send(end_content).then(function(bot_mes) {
       
      let del = "🗑️"
      let run_time = 30 * 60 * 1000 // 30 dakika
      
      setTimeout(function(){   
        bot_mes.react(del);
      }, 2500);
      
      let filter = (reaction, user) => {
          return reaction.emoji.name === del && user.id === message.author.id;
      };

      let collector = bot_mes.createReactionCollector(true, { time: run_time });
      let event_name = 'collect'
      
      let element = [bot_mes,collector,event_name,run_time,new Date()]
      
      let bot_message_delete_time = 2.5 * 1000
      
      let deplated = false
      
      collector.on(event_name, (reaction, user) => {
        
         if(user.id == message.author.id || user.id == OWNER) {
           if (reaction.emoji.name == del) {
            //console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
           
            bot_mes.edit("⚠️ Mesaj " + (bot_message_delete_time / 1000) + " saniye sonra silinecektir.")
            
            setTimeout(function(){
              DeleteMessage(message)
              DeleteMessage(bot_mes)
              deplated = true
              
              DisableCollector(collector,event_name)
              
              try {
                let forDeletion = [element]
                Collectors = Collectors.filter(item => !forDeletion.includes(item))
              }
              catch {}
            },bot_message_delete_time)
             
           }
         }
      });
      
      setTimeout(function(){   
          if (deplated == false)  {
           bot_mes.reactions.removeAll().catch(error => console.log('Failed to clear reactions'));
          }
          collector.stop();
      }, run_time);
      
      Collectors.push(element)
  
    });
  }

}

async function ConnectEvents() {
  
  try {
    let forDeletion = []

    Collectors.forEach((element) => {
      let bot_mes = element[0]
      let collector = element[1]
      let event_name = element[2]
      let run_time = element[3]
      let başlangıç = element[4]
      
      let şu_an = new Date()
      
      if ((şu_an - başlangıç) >= run_time) {
        
        DisableCollector(collector,event_name)

        bot_mes.reactions.removeAll().catch(error => console.log('Failed to clear reactions.'));

        forDeletion.push(element)
      }
        
    });
    
    Collectors = Collectors.filter(item => !forDeletion.includes(item))

  }
  catch(e){console.log(e)}
  

  client.removeAllListeners('messageCreate')
  client.removeAllListeners('ready')

  try {
    Wallets_Json = await HttpRequest(WALLETS_JSON_URL).then((data) => { return data; })
    console.log("Cüzdanlar yenilendi.")
  } 
  catch(e) { }
  
  
  client.on("ready", OnReady)
  client.on("messageCreate", OnMessageCreate);
}

function Loop() {
  
  let suankiZaman = new Date();
  let gecenSure = suankiZaman - loopStart;
  
  
  if (gecenSure >= 30 * 60 * 1000) { // 30 dakika da bir bağlantıları yenile.
    console.log("Bağlantılar kalibre ediliyor...")
    ConnectEvents()
    loopStart = suankiZaman;
  }
  
  setTimeout(Loop,10 * 60 * 1000) // Her 10 dakika da bir kendini yenile
}

function ServerRequestListener(request, response) {
  response.writeHead(200);
  
  var str = "";
  
  if (Client_Closed) {
    str = "BOT KAPALI."
  }
  else {
    str = "OK"
  }
  
  response.write(str);
  response.end();
}

client.login(TOKEN).catch(err => {
  console.log('');
  console.log(("Couldn't log into Discord. Wrong bot token?"));
  console.log('');
  console.log(err);
});;

Loop()

server.on("request", ServerRequestListener);

server.listen(PORT);
