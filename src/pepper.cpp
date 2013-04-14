// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

#include <cstdio>
#include <cstdlib>
#include <deque>
#include <map>
#include <sstream>
#include <string>
#include <pthread.h>

#include <boost/foreach.hpp>
#include <boost/property_tree/ptree.hpp>
#include <boost/property_tree/json_parser.hpp>

#include <ppapi/cpp/file_system.h>
#include <ppapi/cpp/instance.h>
#include <ppapi/cpp/instance_handle.h>
#include <ppapi/cpp/module.h>
#include <ppapi/cpp/var.h>

#include <nacl-mounts/base/MainThreadRunner.h>
#include <nacl-mounts/base/KernelProxy.h>
#include <nacl-mounts/pepper/PepperDirectoryReader.h>
#include <nacl-mounts/pepper/PepperMount.h>

extern "C" {
#include "k2pdfopt_api.h"
}

#define Err(fmt, args...) \
  fprintf(stderr, "%s:%-24s:%3d:ERR: " fmt "\n", \
      __FILE__, __func__, __LINE__, ##args)

#define Log(fmt, args...) \
  fprintf(stderr, "%s:%-24s:%3d:LOG: " fmt "\n", \
      __FILE__, __func__, __LINE__, ##args)

#define MOUNT_ROOT "/app"

namespace k2pdfopt_ppapi {

class WithLock {
 public:
  explicit WithLock(pthread_mutex_t *lock) : lock_(lock) {
    pthread_mutex_lock(lock_);
  }
  virtual ~WithLock() {
    pthread_mutex_unlock(lock_);
  }

 private:
  pthread_mutex_t *lock_;
};

typedef boost::property_tree::ptree Message;
static Message StringToMessage(const std::string& json);
static std::string MessageToString(const Message& message);

class PepperStub;
typedef void (PepperStub::*PushMessageMethod)(const Message& message);

class K2pdfoptMain : public DirectoryReader {
 public:
  K2pdfoptMain(PepperStub *pepper_stub, PushMessageMethod push_message);
  virtual ~K2pdfoptMain();

  // Inherit from DirectoryReader
  typedef std::set<std::string> EntrySet;
  virtual int ReadDirectory(const std::string& path,
      EntrySet *entries, const pp::CompletionCallback& cc);

  bool Init(uint32_t argc, const char *argn[], const char *argv[]);

  void PushMessage(const Message& message);

 private:
  struct Recipient {
    void (K2pdfoptMain::*receive_)(Message& message, Recipient& recipient);
    struct {
      EntrySet *entries_;
      pp::CompletionCallback cc_;
    } read_directory_;
  };

  static void *StaticMain(void *argblob);
  void *Main();

  static void *ListDirectory(void *argblob);

  struct ExecuteK2pdfoptArgBlob {
    ExecuteK2pdfoptArgBlob(K2pdfoptMain *self,
        const std::string& input_path, const std::string& output_path)
        : self_(self), input_path_(input_path), output_path_(output_path) {}
    K2pdfoptMain *self_;
    std::string input_path_;
    std::string output_path_;
  };
  static void *ExecuteK2pdfopt(void *argblob);

  bool MountFileSystem();

  int RegisterRecipient(const Recipient& recipient);
  Recipient PopRecipient(int recipient_id);

  void ReadDirectoryCompletion(Message& message, Recipient& recipient);

  // TODO(clchiou): Parse (argc, argn, argv) list for file system size, etc.
  static const int64_t exp_size_ = 64 * 1024 * 1024;

  pthread_t app_thread_;
  pthread_t background_thread_;

  pthread_mutex_t lock_;
  pthread_cond_t is_not_empty_;
  std::deque<Message> message_queue_;

  typedef std::map<int, Recipient> RecipientMap;
  RecipientMap message_recipients_;

  PepperStub *pepper_stub_;
  PushMessageMethod push_message_;

  pp::FileSystem *fs_;
  MainThreadRunner *mt_runner_;
};

class PepperStub : public pp::Instance {
 public:
  explicit PepperStub(PP_Instance instance);
  virtual ~PepperStub();

  virtual bool Init(uint32_t argc, const char *argn[], const char *argv[]);
  virtual void HandleMessage(const pp::Var& message);

  void PushMessage(const Message& message);

 private:
  K2pdfoptMain main_;
};

static Message StringToMessage(const std::string& json) {
  Message message;
  std::istringstream isstream(json);
  boost::property_tree::read_json(isstream, message);
  return message;
}

static std::string MessageToString(const Message& message) {
  std::ostringstream osstream;
  write_json(osstream, message, false);
  return osstream.str();
}

K2pdfoptMain::K2pdfoptMain(PepperStub *pepper_stub,
                           PushMessageMethod push_message)
    : app_thread_(0), background_thread_(0),
      pepper_stub_(pepper_stub), push_message_(push_message),
      fs_(NULL), mt_runner_(NULL) {
  pthread_mutex_init(&lock_, NULL);
  pthread_cond_init(&is_not_empty_, NULL);
}

K2pdfoptMain::~K2pdfoptMain() {
  if (app_thread_)
    pthread_join(app_thread_, NULL);
  if (background_thread_)
    pthread_join(background_thread_, NULL);
  delete fs_;
  delete mt_runner_;
  pthread_mutex_destroy(&lock_);
  pthread_cond_destroy(&is_not_empty_);
}

bool K2pdfoptMain::Init(uint32_t argc, const char *argn[],
    const char *argv[]) {
  Log(">>> %s", __func__);
  fs_ = new pp::FileSystem(pp::InstanceHandle(pepper_stub_),
                           PP_FILESYSTEMTYPE_LOCALTEMPORARY);
  mt_runner_ = new MainThreadRunner(pepper_stub_);
  int err = pthread_create(&background_thread_, NULL, StaticMain, this);
  if (err) {
    Err("Couldn't create background thread: %d", err);
    background_thread_ = 0;
    Message message;
    message.put("type", "error");
    message.put("reason", "Couldn't create background thread");
    (pepper_stub_->*push_message_)(message);
    return false;
  }
  Log("<<< %s", __func__);
  return true;
}

void *K2pdfoptMain::StaticMain(void *argblob) {
  K2pdfoptMain *self = reinterpret_cast<K2pdfoptMain*>(argblob);
  return self->Main();
}

void *K2pdfoptMain::Main() {
  Log(">>> %s", __func__);
  if (!MountFileSystem())
    return NULL;
  for (;;) {
    Message message;
    do {
      WithLock with(&lock_);
      while (message_queue_.empty())
        pthread_cond_wait(&is_not_empty_, &lock_);
      message = message_queue_.back();
      message_queue_.pop_back();
    } while (0);
    std::string type = message.get<std::string>("type", "");
    Log("Got message of type '%s'", type.c_str());
    if (type == "sys") {
      std::string action = message.get<std::string>("action", "");
      Log("Got action '%s'", action.c_str());
      if (action == "quit") {
        break;
      } else if (action == "ls") {
        if (app_thread_) {
          Err("Couldn't start a new thread because one is still running");
          continue;
        }
        // This action is used for testing DirectoryReader implementation.
        int err = pthread_create(&app_thread_, NULL, ListDirectory, this);
        if (err) {
          Err("Couldn't create app thread: %d", err);
          app_thread_ = 0;
        }
      } else if (action == "k2pdfopt") {
        if (app_thread_) {
          Err("Couldn't start a new thread because one is still running");
          continue;
        }
        Log("Execute k2pdfopt...");
        std::string input_path = message.get<std::string>("input_path", "");
        std::string output_path = message.get<std::string>("output_path", "");
        if (input_path == "" || output_path == "") {
          Err("Path(s) are empty: input_path='%s' output_path='%s'",
              input_path.c_str(), output_path.c_str());
          continue;
        }
        input_path = MOUNT_ROOT + input_path;
        output_path = MOUNT_ROOT + output_path;
        ExecuteK2pdfoptArgBlob *blob =
          new ExecuteK2pdfoptArgBlob(this, input_path, output_path);
        int err = pthread_create(&app_thread_, NULL, ExecuteK2pdfopt, blob);
        if (err) {
          Err("Couldn't create app thread: %d", err);
          app_thread_ = 0;
        }
      } else if (action == "join") {
        std::string whoami = message.get<std::string>("whoami", "");
        Log("Join thread %s...", whoami.c_str());
        if (app_thread_) {
          pthread_join(app_thread_, NULL);
          app_thread_ = 0;
        }
        Log("Done joining thread");
        Message message;
        message.put("type", "info");
        message.put("name", "thread_completed");
        message.put("whoami", whoami);
        (pepper_stub_->*push_message_)(message);
      } else {
        Err("Couldn't recognize sys.action '%s'", action.c_str());
      }
    } else if (type == "action") {
      int recipient_id = message.get<int>("recipient", -1);
      if (recipient_id < 0) {
        Err("Couldn't find message recipient");
        continue;
      }
      Recipient recipient = PopRecipient(recipient_id);
      (this->*recipient.receive_)(message, recipient);
    } else {
      Err("Couldn't recognize message type '%s'", type.c_str());
    }
  }
  Log("<<< %s", __func__);
  return NULL;
}

void *K2pdfoptMain::ListDirectory(void *argblob) {
  Log(">>> %s", __func__);
  K2pdfoptMain *self = reinterpret_cast<K2pdfoptMain*>(argblob);
  DIR *dir;
  struct dirent *ent;
  if ((dir = opendir(MOUNT_ROOT)) != NULL) {
    while ((ent = readdir(dir)) != NULL) {
      Log("ent->d_name=%s", ent->d_name);
    }
    closedir(dir);
  } else {
    Err("Couldn't open directory");
  }
  Message message;
  message.put("type", "sys");
  message.put("action", "join");
  message.put("whoami", "list_directory");
  self->PushMessage(message);
  Log("<<< %s", __func__);
  return NULL;
}

void *K2pdfoptMain::ExecuteK2pdfopt(void *argblob) {
  Log(">>> %s", __func__);
  ExecuteK2pdfoptArgBlob *blob =
    reinterpret_cast<ExecuteK2pdfoptArgBlob*>(argblob);
  const char *argv[] = {
    "k2pdfopt",
    "-ui-", "-a-", "-x",
    "-o", blob->output_path_.c_str(),
    blob->input_path_.c_str(),
  };
  int argc = sizeof(argv) / sizeof(argv[0]);
  int ret = k2pdfopt_main(argc, argv);
  Log("k2pdfopt returned %d", ret);
  Message message;
  message.put("type", "sys");
  message.put("action", "join");
  message.put("whoami", "execute_k2pdfopt");
  blob->self_->PushMessage(message);
  delete blob;
  Log("<<< %s", __func__);
  return NULL;
}

bool K2pdfoptMain::MountFileSystem() {
  Log(">>> %s", __func__);
  PepperMount *mount = new PepperMount(mt_runner_, fs_, exp_size_);
  mount->SetDirectoryReader(this);
  int32_t err = KernelProxy::KPInstance()->mount(MOUNT_ROOT, mount);
  if (err) {
    Err("Could't mount " MOUNT_ROOT ": %d", err);
    delete mount;
    Message message;
    message.put("type", "error");
    message.put("reason", "Couldn't mount " MOUNT_ROOT);
    (pepper_stub_->*push_message_)(message);
    return false;
  }
  Log("<<< %s", __func__);
  return true;
}

int K2pdfoptMain::RegisterRecipient(const Recipient& recipient) {
  WithLock with(&lock_);
  RecipientMap::const_iterator end = message_recipients_.end();
  for (;;) {
    int recipient_id = rand();
    if (end == message_recipients_.find(recipient_id)) {
      Log("Register id %d for recipient", recipient_id);
      message_recipients_[recipient_id] = recipient;
      return recipient_id;
    }
  }
  return -1;
}

K2pdfoptMain::Recipient K2pdfoptMain::PopRecipient(int recipient_id) {
  WithLock with(&lock_);
  Recipient recipient = message_recipients_[recipient_id];
  message_recipients_.erase(recipient_id);
  return recipient;
}

int K2pdfoptMain::ReadDirectory(const std::string& path,
    EntrySet *entries, const pp::CompletionCallback& cc) {
  Log(">>> %s", __func__);
  Recipient recipient;
  recipient.receive_ = &K2pdfoptMain::ReadDirectoryCompletion;
  recipient.read_directory_.entries_ = entries;
  recipient.read_directory_.cc_ = cc;
  int recipient_id = RegisterRecipient(recipient);
  Message message;
  message.put("type", "action");
  message.put("recipient", recipient_id);
  message.put("action", "read_directory");
  message.put("path", path);
  (pepper_stub_->*push_message_)(message);
  Log("<<< %s", __func__);
  return PP_OK;
}

void K2pdfoptMain::ReadDirectoryCompletion(Message& message,
    Recipient& recipient) {
  Log(">>> %s", __func__);
  EntrySet *entries = recipient.read_directory_.entries_;
  pp::CompletionCallback& cc = recipient.read_directory_.cc_;
  BOOST_FOREACH(Message::value_type &v, message.get_child("files")) {
    entries->insert(v.second.data());
  }
  cc.Run(PP_OK);
  Log("<<< %s", __func__);
}

void K2pdfoptMain::PushMessage(const Message& message) {
  WithLock with(&lock_);
  message_queue_.push_front(message);
  pthread_cond_signal(&is_not_empty_);
}

PepperStub::PepperStub(PP_Instance instance)
    : pp::Instance(instance),
      main_(this, &PepperStub::PushMessage) {
}

PepperStub::~PepperStub() {
}

bool PepperStub::Init(uint32_t argc, const char *argn[], const char *argv[]) {
  return main_.Init(argc, argn, argv);
}

void PepperStub::HandleMessage(const pp::Var& message) {
  if (!message.is_string()) {
    Err("Message is not a string");
    return;
  }
  main_.PushMessage(StringToMessage(message.AsString()));
}

void PepperStub::PushMessage(const Message& message) {
  PostMessage(pp::Var(MessageToString(message)));
}

class K2pdfoptModule : public pp::Module {
  public:
    K2pdfoptModule() {}
  virtual ~K2pdfoptModule() {}
  virtual pp::Instance *CreateInstance(PP_Instance instance) {
    return new PepperStub(instance);
  }
};

}  // namespace k2pdfopt_ppapi

namespace pp {
  Module *CreateModule() {
    return new k2pdfopt_ppapi::K2pdfoptModule();
  }
}  // namespace pp
